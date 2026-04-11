# =============================================================
#  backend/compiler/semantic/symbol_table.py
#
#  WHAT CHANGED vs previous version:
#  ─────────────────────────────────
#  1. Added evaluate(node) method to SemanticAnalyser
#     → Recursively computes the actual numeric value of any
#       expression node at compile time.
#     → NumberNode  → returns its literal value directly
#     → IdentifierNode → looks up symbol.value in the table
#     → BinaryOpNode → recursively evaluates both sides, applies op
#     → Returns None if any operand is unknown/undefined
#
#  2. _check_stmt() now calls evaluate() on the RHS and stores
#     the computed value in the symbol table.
#     → Before: symbol.value was always None (shown as '?')
#     → After:  symbol.value holds the actual computed number
#               e.g. a=5, b=20, c=15
#
#  3. summary() now shows computed values (not '?') in the table.
#
#  Everything else (CompilerError, Symbol, SymbolTable,
#  function signatures) is 100% unchanged.
# =============================================================


# ─── Structured error object ──────────────────────────────────

class CompilerError:
    """
    One structured error message.
    Routes.py converts this to a plain string via str().
    """
    def __init__(self, error_type: str, message: str, line: int, col: int = 0):
        self.error_type = error_type   # 'SyntaxError' | 'TypeError' | 'NameError'
        self.message    = message
        self.line       = line
        self.col        = col

    def __str__(self):
        loc = f"Line {self.line}"
        if self.col:
            loc += f", Col {self.col}"
        return f"{self.error_type} at {loc}: {self.message}"

    def to_dict(self):
        return {
            "type":    self.error_type,
            "message": self.message,
            "line":    self.line,
            "col":     self.col,
        }


# ─── Symbol entry ─────────────────────────────────────────────

class Symbol:
    def __init__(self, name: str, inferred_type: str, value=None, line: int = 0):
        self.name          = name
        self.inferred_type = inferred_type   # 'int' | 'float' | 'unknown'
        self.value         = value           # ← now stores computed number (not None)
        self.line          = line            # line where first assigned

    def __repr__(self):
        return (f"Symbol(name={self.name!r}, type={self.inferred_type!r}, "
                f"value={self.value!r}, line={self.line})")


# ─── Symbol table ─────────────────────────────────────────────

class SymbolTable:
    def __init__(self):
        self._table: dict[str, Symbol] = {}

    def declare(self, name: str, inferred_type: str = 'unknown',
                value=None, line: int = 0):
        """Add or update a variable entry."""
        self._table[name] = Symbol(name, inferred_type, value, line)

    def lookup(self, name: str) -> Symbol | None:
        """Return the symbol or None if not found."""
        return self._table.get(name)

    def is_defined(self, name: str) -> bool:
        return name in self._table

    def all_symbols(self):
        return list(self._table.values())

    def summary(self) -> str:
        """
        Human-readable dump of the table.
        Now shows computed values instead of '?'.

        Example:
          Name         Type     Value      Line
          ────────────────────────────────────
          a            int      5          1
          b            int      20         2
          c            int      15         3
        """
        if not self._table:
            return "Symbol table is empty."
        lines = ["Symbol Table:"]
        lines.append(f"  {'Name':<12} {'Type':<8} {'Value':<10} Line")
        lines.append("  " + "-" * 36)
        for sym in self._table.values():
            # Show computed numeric value when available, else '?'
            if sym.value is not None:
                # Format cleanly: drop trailing .0 for whole floats
                val = (str(int(sym.value))
                       if isinstance(sym.value, float) and sym.value == int(sym.value)
                       else str(sym.value))
            else:
                val = '?'
            lines.append(f"  {sym.name:<12} {sym.inferred_type:<8} {val:<10} {sym.line}")
        return "\n".join(lines)


# ─── AST node imports ─────────────────────────────────────────

from backend.compiler.ast.ast_nodes import (
    ProgramNode, AssignmentNode, BinaryOpNode,
    NumberNode, IdentifierNode
)


# ─── Semantic analyser ────────────────────────────────────────

class SemanticAnalyser:
    def __init__(self):
        self.table  = SymbolTable()
        self.errors: list[CompilerError] = []

    # ── NEW: evaluate(node) ───────────────────────────────────
    def evaluate(self, node) -> float | int | None:
        """
        Recursively compute the numeric value of an expression node.

        Returns the computed number, or None if the value cannot
        be determined (e.g. variable not yet defined, or not a
        constant expression).

        HOW IT WORKS (for viva):
        ─────────────────────────
        • NumberNode:      return its literal value directly.
        • IdentifierNode:  look it up in the symbol table.
                           If the symbol has a stored value, return it.
                           Otherwise return None (unknown at compile time).
        • BinaryOpNode:    recursively evaluate left and right.
                           If BOTH sides resolved to a number, apply the
                           operator and return the result.
                           If either side is None, return None.

        This is essentially a tiny constant-expression evaluator
        embedded in the semantic pass.
        """
        if isinstance(node, NumberNode):
            # Leaf case: literal number
            return node.value

        if isinstance(node, IdentifierNode):
            # Leaf case: look up the variable's stored value
            sym = self.table.lookup(node.name)
            if sym is not None and sym.value is not None:
                return sym.value
            return None   # unknown at compile time

        if isinstance(node, BinaryOpNode):
            # Inner case: evaluate both children first
            left_val  = self.evaluate(node.left)
            right_val = self.evaluate(node.right)

            # Can only fold if BOTH sides are known numbers
            if left_val is None or right_val is None:
                return None

            # Guard against division by zero
            if node.op == '/' and right_val == 0:
                return None

            # Apply the operator
            if   node.op == '+': return left_val + right_val
            elif node.op == '-': return left_val - right_val
            elif node.op == '*': return left_val * right_val
            elif node.op == '/':
                result = left_val / right_val
                # Keep as int if the division is exact
                return int(result) if result == int(result) else result

        return None   # unsupported node type

    # ── Type inference (unchanged) ────────────────────────────
    def _infer_type(self, node) -> str:
        """Return 'int', 'float', or 'unknown' for an expression node."""
        if isinstance(node, NumberNode):
            return 'float' if isinstance(node.value, float) else 'int'
        if isinstance(node, IdentifierNode):
            sym = self.table.lookup(node.name)
            return sym.inferred_type if sym else 'unknown'
        if isinstance(node, BinaryOpNode):
            lt = self._infer_type(node.left)
            rt = self._infer_type(node.right)
            if lt == 'float' or rt == 'float':
                return 'float'
            return 'int'
        return 'unknown'

    # ── Undefined-variable checker (unchanged) ────────────────
    def _check_expr(self, node):
        """Recursively check an expression for undefined identifiers."""
        if isinstance(node, IdentifierNode):
            if not self.table.is_defined(node.name):
                self.errors.append(CompilerError(
                    error_type = 'NameError',
                    message    = f"Variable '{node.name}' used before assignment",
                    line       = node.line,
                ))
        elif isinstance(node, BinaryOpNode):
            self._check_expr(node.left)
            self._check_expr(node.right)

    # ── Statement handler — now stores computed value ─────────
    def _check_stmt(self, node):
        if isinstance(node, AssignmentNode):
            # 1. Check RHS for undefined variables
            self._check_expr(node.value)

            # 2. Infer the type of the RHS
            inferred = self._infer_type(node.value)

            # 3. ← NEW: evaluate the RHS to get the actual computed value
            #    e.g.  a = 2 + 3   →  computed_value = 5
            #          b = a * 4   →  computed_value = 20  (uses a=5 from table)
            #          c = b - a   →  computed_value = 15
            computed_value = self.evaluate(node.value)

            # 4. Store name, type, AND computed value in the symbol table
            self.table.declare(
                name          = node.variable,
                inferred_type = inferred,
                value         = computed_value,   # ← was always None before
                line          = node.line,
            )

    def analyse(self, program: ProgramNode):
        """Run semantic analysis on a full program AST."""
        for stmt in program.statements:
            self._check_stmt(stmt)
        return self.errors