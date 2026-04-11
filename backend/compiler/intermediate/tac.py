# =============================================================
#  backend/compiler/intermediate/tac.py
#
#  WHAT CHANGED vs original:
#  - No longer splits code by semicolons and guesses structure
#  - Internally calls parse_to_ast() to get a real AST first
#  - Walks the AST recursively to emit correct 3-address code
#  - Handles operator precedence correctly (AST does the work)
#  - Uses temp variables t1, t2, ... exactly as before
#  - generate_TAC(code) still takes a code string → backward compat
#
#  HOW 3-ADDRESS CODE WORKS (for viva):
#  Every instruction has at most ONE operator.
#  Complex expressions are broken into steps using temp variables.
#
#  EXAMPLE:
#  Source:   a = 2 * 3 + b
#  AST:      AssignmentNode(a, BinaryOp(+, BinaryOp(*, 2, 3), b))
#  TAC:
#    t1 = 2 * 3        ← inner BinaryOp first
#    t2 = t1 + b       ← outer BinaryOp uses t1
#    a  = t2           ← final assignment
# =============================================================

from backend.compiler.parser.parser import parse_to_ast
from backend.compiler.ast.ast_nodes  import (
    ProgramNode, AssignmentNode, BinaryOpNode,
    NumberNode, IdentifierNode
)


class TACGenerator:
    """
    Walks an AST and emits Three-Address Code instructions.
    One instance per compilation — do not reuse.
    """

    def __init__(self):
        self._temp_count  = 1      # counter for t1, t2, ...
        self._instructions = []    # list of TAC strings (final output)

    # ── Helpers ───────────────────────────────────────────────

    def _new_temp(self) -> str:
        """Allocate a fresh temporary variable name."""
        name = f"t{self._temp_count}"
        self._temp_count += 1
        return name

    def _emit(self, line: str):
        """Append one TAC instruction."""
        self._instructions.append(line)

    # ── Expression visitor ────────────────────────────────────

    def _gen_expr(self, node) -> str:
        """
        Recursively generate TAC for an expression node.
        Returns the name of the variable/temp that holds the result.
        """

        # ── Leaf: integer or float literal ────────────────────
        if isinstance(node, NumberNode):
            return str(node.value)

        # ── Leaf: variable reference ──────────────────────────
        if isinstance(node, IdentifierNode):
            return node.name

        # ── Inner node: binary operation ──────────────────────
        if isinstance(node, BinaryOpNode):
            # Recursively evaluate both sides first (post-order traversal)
            left_val  = self._gen_expr(node.left)
            right_val = self._gen_expr(node.right)

            # Allocate a temp for this operation's result
            temp = self._new_temp()
            self._emit(f"{temp} = {left_val} {node.op} {right_val}")
            return temp

        # Fallback (should not happen with a well-formed AST)
        raise ValueError(f"TACGenerator: unknown node type {type(node).__name__}")

    # ── Statement visitor ─────────────────────────────────────

    def _gen_stmt(self, node):
        if isinstance(node, AssignmentNode):
            # Generate TAC for the right-hand side expression
            result_var = self._gen_expr(node.value)

            # If the result is already in a temp, assign it to the variable.
            # If the result IS the variable itself (trivial `a = a`), skip.
            if result_var != node.variable:
                self._emit(f"{node.variable} = {result_var}")

    # ── Program entry ─────────────────────────────────────────

    def generate(self, program: ProgramNode) -> list[str]:
        """Generate TAC for every statement in the program."""
        for stmt in program.statements:
            self._gen_stmt(stmt)
        return self._instructions


# ─────────────────────────────────────────────────────────────
#  Public API  (called by routes.py — signature unchanged)
# ─────────────────────────────────────────────────────────────

def generate_TAC(code: str) -> list[str]:
    """
    Main entry point.
    Accepts raw source code, returns a list of TAC strings.
    Identical signature to original for routes.py compatibility.
    """
    # Step 1: Build AST (using the upgraded parser)
    ast, errors = parse_to_ast(code)

    if errors:
        # Surface parse errors as TAC error messages
        return [f"TAC Error: {e}" for e in errors]

    # Step 2: Walk AST and emit TAC
    try:
        gen = TACGenerator()
        return gen.generate(ast)
    except Exception as e:
        return [f"TAC Error: {str(e)}"]