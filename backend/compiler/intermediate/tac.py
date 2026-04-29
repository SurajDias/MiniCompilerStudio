# =============================================================
#  backend/compiler/intermediate/tac.py
#
#  FINAL UPGRADE:
#  - Added WhileNode TAC generation 🔥
# =============================================================

from backend.compiler.parser.parser  import parse_to_ast
from backend.compiler.ast.ast_nodes  import (
    ProgramNode, AssignmentNode, BinaryOpNode,
    NumberNode, IdentifierNode,
    IfNode, ConditionNode, WhileNode
)


class TACGenerator:

    def __init__(self):
        self._temp_count   = 1
        self._label_count  = 1
        self._instructions = []

    # ─────────────────────────────
    # Helpers
    # ─────────────────────────────

    def _new_temp(self):
        t = f"t{self._temp_count}"
        self._temp_count += 1
        return t

    def _new_label(self):
        l = f"L{self._label_count}"
        self._label_count += 1
        return l

    def _emit(self, line):
        self._instructions.append(line)

    def _emit_label(self, label):
        self._instructions.append(f"{label}:")

    # ─────────────────────────────
    # Expressions
    # ─────────────────────────────

    def _gen_expr(self, node):

        if isinstance(node, NumberNode):
            return str(node.value)

        if isinstance(node, IdentifierNode):
            return node.name

        if isinstance(node, BinaryOpNode):
            l = self._gen_expr(node.left)
            r = self._gen_expr(node.right)
            t = self._new_temp()
            self._emit(f"{t} = {l} {node.op} {r}")
            return t

        raise ValueError("Unknown expression")

    # ─────────────────────────────
    # Condition
    # ─────────────────────────────

    def _gen_condition(self, node):
        l = self._gen_expr(node.left)
        r = self._gen_expr(node.right)
        return l, r, node.op

    # ─────────────────────────────
    # Statements
    # ─────────────────────────────

    def _gen_stmt(self, node):

        if isinstance(node, AssignmentNode):
            self._gen_assignment(node)

        elif isinstance(node, IfNode):
            self._gen_if(node)

        elif isinstance(node, WhileNode):
            self._gen_while(node)

    # ─────────────────────────────
    # Assignment
    # ─────────────────────────────

    def _gen_assignment(self, node):
        val = self._gen_expr(node.value)
        if val != node.variable:
            self._emit(f"{node.variable} = {val}")

    # ─────────────────────────────
    # IF
    # ─────────────────────────────

    def _gen_if(self, node):

        then_label = self._new_label()
        end_label  = self._new_label()

        l, r, op = self._gen_condition(node.condition)

        if node.else_body:
            else_label = self._new_label()

            self._emit(f"if {l} {op} {r} goto {then_label}")
            self._emit(f"goto {else_label}")

            self._emit_label(then_label)
            for s in node.then_body:
                self._gen_stmt(s)
            self._emit(f"goto {end_label}")

            self._emit_label(else_label)
            for s in node.else_body:
                self._gen_stmt(s)

            self._emit_label(end_label)

        else:
            self._emit(f"if {l} {op} {r} goto {then_label}")
            self._emit(f"goto {end_label}")

            self._emit_label(then_label)
            for s in node.then_body:
                self._gen_stmt(s)

            self._emit_label(end_label)

    # ─────────────────────────────
    # 🔥 WHILE LOOP (FINAL BOSS)
    # ─────────────────────────────

    def _gen_while(self, node):

        start_label = self._new_label()
        body_label  = self._new_label()
        end_label   = self._new_label()

        # loop start
        self._emit_label(start_label)

        l, r, op = self._gen_condition(node.condition)

        # condition check
        self._emit(f"if {l} {op} {r} goto {body_label}")
        self._emit(f"goto {end_label}")

        # loop body
        self._emit_label(body_label)
        for stmt in node.body:
            self._gen_stmt(stmt)

        # jump back
        self._emit(f"goto {start_label}")

        # exit
        self._emit_label(end_label)

    # ─────────────────────────────
    # Program
    # ─────────────────────────────

    def generate(self, program):

        for stmt in program.statements:
            self._gen_stmt(stmt)

        return self._instructions


# ─────────────────────────────
# Public API
# ─────────────────────────────

def generate_TAC(code: str):

    ast, errors = parse_to_ast(code)

    if errors:
        return [f"TAC Error: {e}" for e in errors]

    try:
        gen = TACGenerator()
        return gen.generate(ast)
    except Exception as e:
        return [f"TAC Error: {str(e)}"]