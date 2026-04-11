# =============================================================
#  backend/compiler/parser/parser.py
#
#  WHAT CHANGED vs original:
#  - Replaced split()-based approach with a real recursive
#    descent parser (industry-standard technique)
#  - Proper operator precedence: * / before + -
#  - Builds a full AST instead of returning a string
#  - Structured errors with line and column numbers
#  - parse() still returns a STRING for routes.py compatibility
#  - parse_to_ast() returns the AST for TAC generation
#
#  GRAMMAR (what the parser understands):
#  ───────────────────────────────────────
#  program    → statement* EOF
#  statement  → assignment SEMICOLON
#  assignment → ID EQUALS expression
#  expression → term ( (PLUS | MINUS) term )*
#  term       → factor ( (STAR | SLASH) factor )*
#  factor     → NUMBER | FLOAT | ID | LPAREN expression RPAREN
# =============================================================

from backend.compiler.lexer.tokenizer import tokenize_full, Token
from backend.compiler.ast.ast_nodes   import (
    ProgramNode, AssignmentNode, BinaryOpNode,
    NumberNode, IdentifierNode, ast_to_string
)
from backend.compiler.semantic.symbol_table import SemanticAnalyser


# ─────────────────────────────────────────────────────────────
#  Parser class
# ─────────────────────────────────────────────────────────────

class Parser:
    def __init__(self, tokens: list[Token]):
        self.tokens = tokens
        self.pos    = 0         # current position in token list
        self.errors = []        # list of error strings collected

    # ── Token navigation ──────────────────────────────────────

    def _current(self) -> Token | None:
        """Return the token at the current position (or None at EOF)."""
        if self.pos < len(self.tokens):
            return self.tokens[self.pos]
        return None

    def _peek_type(self) -> str:
        """Return current token's type, or 'EOF'."""
        tok = self._current()
        return tok.type if tok else 'EOF'

    def _peek_value(self) -> str:
        """Return current token's value, or ''."""
        tok = self._current()
        return tok.value if tok else ''

    def _advance(self) -> Token:
        """Consume and return the current token."""
        tok = self._current()
        self.pos += 1
        return tok

    def _expect(self, ttype: str, tvalue: str = None) -> Token | None:
        """
        Consume a token of the expected type (and optionally value).
        Records an error and returns None if the token doesn't match.
        """
        tok = self._current()
        if tok is None:
            self._error(f"Expected {ttype!r} but reached end of input", line=0)
            return None
        if tok.type != ttype:
            self._error(
                f"Expected {ttype!r} but got {tok.type!r} ({tok.value!r})",
                line=tok.line, col=tok.col
            )
            return None
        if tvalue is not None and tok.value != tvalue:
            self._error(
                f"Expected {tvalue!r} but got {tok.value!r}",
                line=tok.line, col=tok.col
            )
            return None
        return self._advance()

    def _error(self, message: str, line: int = 0, col: int = 0):
        loc = f"Line {line}" + (f", Col {col}" if col else "")
        self.errors.append(f"SyntaxError at {loc}: {message}")

    # ── Grammar rules ─────────────────────────────────────────

    def parse_program(self) -> ProgramNode:
        """
        program → statement* EOF
        Entry point — parses every statement until tokens run out.
        """
        statements = []

        while self._peek_type() != 'EOF':
            stmt = self._parse_statement()
            if stmt is not None:
                statements.append(stmt)

        return ProgramNode(statements)

    def _parse_statement(self):
        """
        statement → assignment SEMICOLON
        Tries to parse one complete assignment like:  a = 2 * 3;
        """
        tok = self._current()
        if tok is None:
            return None

        # Must start with an identifier (left-hand side)
        if tok.type != 'ID':
            self._error(
                f"Statement must start with an identifier, got {tok.value!r}",
                line=tok.line, col=tok.col
            )
            # Skip to the next semicolon to recover
            self._skip_to_semicolon()
            return None

        # Parse:  ID = expression ;
        id_tok = self._advance()                      # consume ID
        self._expect('OP', '=')                       # consume '='
        expr = self._parse_expression()               # parse right side
        self._expect('SEPARATOR', ';')                # consume ';'

        if expr is None:
            return None

        return AssignmentNode(
            variable = id_tok.value,
            value    = expr,
            line     = id_tok.line
        )

    def _parse_expression(self):
        """
        expression → term ( ('+' | '-') term )*
        Handles addition and subtraction (lowest precedence).
        """
        left = self._parse_term()
        if left is None:
            return None

        while self._peek_type() == 'OP' and self._peek_value() in ('+', '-'):
            op_tok = self._advance()                  # consume operator
            right  = self._parse_term()
            if right is None:
                return None
            left = BinaryOpNode(op_tok.value, left, right, line=op_tok.line)

        return left

    def _parse_term(self):
        """
        term → factor ( ('*' | '/') factor )*
        Handles multiplication and division (higher precedence).
        """
        left = self._parse_factor()
        if left is None:
            return None

        while self._peek_type() == 'OP' and self._peek_value() in ('*', '/'):
            op_tok = self._advance()                  # consume operator
            right  = self._parse_factor()
            if right is None:
                return None
            left = BinaryOpNode(op_tok.value, left, right, line=op_tok.line)

        return left

    def _parse_factor(self):
        """
        factor → NUMBER | FLOAT | ID | LPAREN expression RPAREN
        Handles the most basic units: literals, variables, sub-expressions.
        """
        tok = self._current()
        if tok is None:
            self._error("Unexpected end of input while parsing expression")
            return None

        # Integer literal
        if tok.type == 'NUMBER':
            self._advance()
            return NumberNode(tok.value, line=tok.line)

        # Float literal
        if tok.type == 'FLOAT':
            self._advance()
            return NumberNode(tok.value, line=tok.line)

        # Variable reference
        if tok.type == 'ID':
            self._advance()
            return IdentifierNode(tok.name if hasattr(tok,'name') else tok.value,
                                  line=tok.line)

        # Parenthesised sub-expression  ( expr )
        if tok.type == 'LPAREN':
            self._advance()                           # consume '('
            expr = self._parse_expression()
            self._expect('RPAREN')                    # consume ')'
            return expr

        # Unrecognised token
        self._error(
            f"Unexpected token {tok.value!r} in expression",
            line=tok.line, col=tok.col
        )
        self._advance()   # consume the bad token to avoid infinite loops
        return None

    def _skip_to_semicolon(self):
        """Error recovery: skip tokens until we find a ';' or EOF."""
        while self._peek_type() not in ('SEPARATOR', 'EOF'):
            self._advance()
        if self._peek_value() == ';':
            self._advance()   # consume the ';'


# ─────────────────────────────────────────────────────────────
#  Public API
# ─────────────────────────────────────────────────────────────

def parse_to_ast(code: str):
    """
    Parse `code` and return (ProgramNode, errors[]).
    Used internally by generate_TAC() and the semantic analyser.
    """
    tokens = tokenize_full(code)
    parser = Parser(tokens)
    ast    = parser.parse_program()
    return ast, parser.errors


def parse(code: str) -> str:
    """
    Public function called by routes.py.
    Returns a human-readable string — either the pretty-printed
    AST or a structured error message.
    Backward-compatible: routes.py checks for "Error" in result.
    """
    ast, parse_errors = parse_to_ast(code)

    # ── Syntax errors: return first error string ──
    if parse_errors:
        return "\n".join(parse_errors)

    # ── Semantic analysis: check symbol table ──
    analyser        = SemanticAnalyser()
    semantic_errors = analyser.analyse(ast)

    if semantic_errors:
        # Convert structured errors to strings
        err_strings = [str(e) for e in semantic_errors]
        return "\n".join(err_strings)

    # ── Success: return pretty-printed AST + symbol table ──
    ast_str  = ast_to_string(ast)
    sym_str  = analyser.table.summary()
    return f"Parsing Successful\n\n{ast_str}\n\n{sym_str}"