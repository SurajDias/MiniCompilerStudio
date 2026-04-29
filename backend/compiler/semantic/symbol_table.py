# =============================================================
#  backend/compiler/semantic/symbol_table.py
#
#  FIXED:
#  - Removed WRONG redeclaration logic
#  - Now supports:
#       ✔ reassignment (b = a * 2)
#       ✔ multiple updates
#       ✔ no false redeclaration errors
# =============================================================


class CompilerError:
    def __init__(self, error_type: str, message: str, line: int, col: int = 0):
        self.error_type = error_type
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
            "type": self.error_type,
            "message": self.message,
            "line": self.line,
            "col": self.col,
        }


# ─────────────────────────────────────────────

class Symbol:
    def __init__(self, name: str, inferred_type: str, value=None, line: int = 0):
        self.name = name
        self.inferred_type = inferred_type
        self.value = value
        self.line = line

    def __repr__(self):
        return f"{self.name}:{self.inferred_type}={self.value}"


# ─────────────────────────────────────────────

class SymbolTable:
    def __init__(self):
        self._table = {}

    def declare(self, name, inferred_type='unknown', value=None, line=0):
        self._table[name] = Symbol(name, inferred_type, value, line)

    def lookup(self, name):
        return self._table.get(name)

    def is_defined(self, name):
        return name in self._table

    def all_symbols(self):
        return list(self._table.values())

    def summary(self):
        if not self._table:
            return "Symbol table is empty."

        lines = ["Symbol Table:"]
        lines.append(f"{'Name':<10} {'Type':<8} {'Value':<10} Line")
        lines.append("-" * 40)

        for sym in self._table.values():
            val = sym.value if sym.value is not None else "?"
            lines.append(f"{sym.name:<10} {sym.inferred_type:<8} {val:<10} {sym.line}")

        return "\n".join(lines)


# ─────────────────────────────────────────────
# AST imports
# ─────────────────────────────────────────────

from backend.compiler.ast.ast_nodes import (
    ProgramNode, AssignmentNode, BinaryOpNode,
    NumberNode, IdentifierNode, IfNode, ConditionNode
)


# ─────────────────────────────────────────────

class SemanticAnalyser:
    def __init__(self):
        self.table = SymbolTable()
        self.errors = []

    # ───────────── VALUE EVALUATION ─────────────

    def evaluate(self, node):
        if isinstance(node, NumberNode):
            return node.value

        if isinstance(node, IdentifierNode):
            sym = self.table.lookup(node.name)
            return sym.value if sym else None

        if isinstance(node, BinaryOpNode):
            l = self.evaluate(node.left)
            r = self.evaluate(node.right)

            if l is None or r is None:
                return None

            if node.op == '+': return l + r
            if node.op == '-': return l - r
            if node.op == '*': return l * r
            if node.op == '/' and r != 0: return l / r

        return None

    # ───────────── TYPE INFERENCE ─────────────

    def _infer_type(self, node):
        if isinstance(node, NumberNode):
            return 'float' if isinstance(node.value, float) else 'int'

        if isinstance(node, IdentifierNode):
            sym = self.table.lookup(node.name)
            return sym.inferred_type if sym else 'unknown'

        if isinstance(node, BinaryOpNode):
            lt = self._infer_type(node.left)
            rt = self._infer_type(node.right)
            return 'float' if 'float' in (lt, rt) else 'int'

        return 'unknown'

    # ───────────── ERROR CHECKS ─────────────

    def _check_expr(self, node):
        if isinstance(node, IdentifierNode):
            if not self.table.is_defined(node.name):
                self.errors.append(CompilerError(
                    "NameError",
                    f"Variable '{node.name}' used before assignment",
                    node.line
                ))

        elif isinstance(node, BinaryOpNode):
            self._check_expr(node.left)
            self._check_expr(node.right)

    def _check_condition(self, node):
        self._check_expr(node.left)
        self._check_expr(node.right)

    # ───────────── STATEMENTS ─────────────

    def _check_assignment(self, node):
        # check RHS first
        self._check_expr(node.value)

        existing = self.table.lookup(node.variable)

        # ✅ FIX: allow reassignment
        if existing is None:
            self.table.declare(
                node.variable,
                self._infer_type(node.value),
                self.evaluate(node.value),
                node.line
            )
        else:
            # just update value (NO redeclaration error)
            existing.value = self.evaluate(node.value)

    def _check_if(self, node):
        self._check_condition(node.condition)

        for stmt in node.then_body:
            self._check_stmt(stmt)

        for stmt in node.else_body:
            self._check_stmt(stmt)

    def _check_stmt(self, node):
        if isinstance(node, AssignmentNode):
            self._check_assignment(node)
        elif isinstance(node, IfNode):
            self._check_if(node)

    # ───────────── ENTRY ─────────────

    def analyse(self, program):
        for stmt in program.statements:
            self._check_stmt(stmt)
        return self.errors