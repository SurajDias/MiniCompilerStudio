# =============================================================
#  backend/compiler/ast/ast_nodes.py
#
#  UPGRADES:
#  - Added IfNode
#  - Added ConditionNode
#  - 🔥 NEW: Added WhileNode
# =============================================================


class Node:
    """Base class for every AST node."""
    def __init__(self, line: int = 0):
        self.line = line


# ─── Existing nodes (UNCHANGED) ───────────────────────────────

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
        self.value    = value

    def __repr__(self):
        return f"AssignmentNode(var={self.variable!r}, value={self.value!r}, L{self.line})"


class BinaryOpNode(Node):
    def __init__(self, op: str, left: Node, right: Node, line: int = 0):
        super().__init__(line)
        self.op    = op
        self.left  = left
        self.right = right

    def __repr__(self):
        return f"BinaryOp({self.op!r}, {self.left!r}, {self.right!r}, L{self.line})"


class NumberNode(Node):
    def __init__(self, value, line: int = 0):
        super().__init__(line)
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


# ─── Condition + If ───────────────────────────────────────────

class ConditionNode(Node):
    def __init__(self, op: str, left: Node, right: Node, line: int = 0):
        super().__init__(line)
        self.op    = op
        self.left  = left
        self.right = right

    def __repr__(self):
        return f"Condition({self.left!r} {self.op} {self.right!r}, L{self.line})"


class IfNode(Node):
    def __init__(self, condition, then_body, else_body=None, line: int = 0):
        super().__init__(line)
        self.condition = condition
        self.then_body = then_body
        self.else_body = else_body or []

    def __repr__(self):
        return f"IfNode({self.condition}, then={self.then_body}, else={self.else_body})"


# ─── 🔥 NEW: While Node ───────────────────────────────────────

class WhileNode(Node):
    """
    Represents:
        while (condition) { body }
    """
    def __init__(self, condition, body, line: int = 0):
        super().__init__(line)
        self.condition = condition
        self.body      = body

    def __repr__(self):
        return f"WhileNode({self.condition}, body={self.body})"


# ─────────────────────────────────────────────────────────────
#  Pretty-printer (UPDATED)
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
        lines.append(ast_to_string(node.left,  indent + 1))
        lines.append(ast_to_string(node.right, indent + 1))
        return "\n".join(lines)

    if isinstance(node, NumberNode):
        return f"{pad}Number: {node.value}"

    if isinstance(node, IdentifierNode):
        return f"{pad}Identifier: {node.name!r}"

    if isinstance(node, ConditionNode):
        lines = [f"{pad}Condition ({node.op}) [L{node.line}]"]
        lines.append(ast_to_string(node.left, indent + 1))
        lines.append(ast_to_string(node.right, indent + 1))
        return "\n".join(lines)

    if isinstance(node, IfNode):
        lines = [f"{pad}If (L{node.line}):"]
        lines.append(f"{pad}  Condition:")
        lines.append(ast_to_string(node.condition, indent + 2))
        lines.append(f"{pad}  Then:")
        for s in node.then_body:
            lines.append(ast_to_string(s, indent + 2))
        if node.else_body:
            lines.append(f"{pad}  Else:")
            for s in node.else_body:
                lines.append(ast_to_string(s, indent + 2))
        return "\n".join(lines)

    # 🔥 WHILE PRINT SUPPORT
    if isinstance(node, WhileNode):
        lines = [f"{pad}While (L{node.line}):"]
        lines.append(f"{pad}  Condition:")
        lines.append(ast_to_string(node.condition, indent + 2))
        lines.append(f"{pad}  Body:")
        for s in node.body:
            lines.append(ast_to_string(s, indent + 2))
        return "\n".join(lines)

    return f"{pad}UnknownNode"