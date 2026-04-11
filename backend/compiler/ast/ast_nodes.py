# =============================================================
#  backend/compiler/ast/ast_nodes.py
#
#  UPDATED VERSION:
#  - Added line info in BinaryOp repr
#  - Improved NumberNode type handling
#  - Added base Node line attribute
#  - Improved pretty printer formatting
# =============================================================


class Node:
    """Base class for every AST node."""
    def __init__(self, line: int = 0):
        self.line = line


class ProgramNode(Node):
    def __init__(self, statements):
        super().__init__(0)
        self.statements = statements

    def __repr__(self):
        body = "\n".join(repr(s) for s in self.statements)
        return f"Program(\n{body}\n)"


class AssignmentNode(Node):
    def __init__(self, variable: str, value: Node, line: int = 0):
        super().__init__(line)
        self.variable = variable
        self.value = value

    def __repr__(self):
        return f"AssignmentNode(var={self.variable!r}, value={self.value!r}, L{self.line})"


class BinaryOpNode(Node):
    def __init__(self, op: str, left: Node, right: Node, line: int = 0):
        super().__init__(line)
        self.op = op
        self.left = left
        self.right = right

    def __repr__(self):
        return f"BinaryOp({self.op!r}, {self.left!r}, {self.right!r}, L{self.line})"


class NumberNode(Node):
    def __init__(self, value, line: int = 0):
        super().__init__(line)

        # ✅ Improved type handling
        if isinstance(value, (int, float)):
            self.value = value
        else:
            self.value = int(value) if str(value).isdigit() else float(value)

    def __repr__(self):
        return f"Number({self.value})"


class IdentifierNode(Node):
    def __init__(self, name: str, line: int = 0):
        super().__init__(line)
        self.name = name

    def __repr__(self):
        return f"Identifier({self.name!r})"


# ─────────────────────────────────────────────────────────────
#  Pretty-printer
# ─────────────────────────────────────────────────────────────

def ast_to_string(node: Node, indent: int = 0) -> str:
    pad = "  " * indent

    if isinstance(node, ProgramNode):
        lines = [f"{pad}Program ({len(node.statements)} statement(s)):"]
        for stmt in node.statements:
            lines.append(ast_to_string(stmt, indent + 1))
        return "\n".join(lines)

    if isinstance(node, AssignmentNode):
        lines = [f"{pad}Assignment (L{node.line}): {node.variable!r} ="]
        lines.append(ast_to_string(node.value, indent + 1))
        return "\n".join(lines)

    if isinstance(node, BinaryOpNode):
        lines = [f"{pad}BinaryOp ({node.op}) [L{node.line}]"]
        lines.append(ast_to_string(node.left, indent + 1))
        lines.append(ast_to_string(node.right, indent + 1))
        return "\n".join(lines)

    if isinstance(node, NumberNode):
        return f"{pad}Number: {node.value}"

    if isinstance(node, IdentifierNode):
        return f"{pad}Identifier: {node.name!r}"

    return f"{pad}UnknownNode"