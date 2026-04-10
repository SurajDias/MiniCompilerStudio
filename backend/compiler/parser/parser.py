import re

def parse(code):
    try:
        # Split by semicolon to handle multiple statements
        statements = code.split(';')

        for stmt in statements:
            line = stmt.strip()

            if not line:
                continue

            if '=' not in line:
                return f"Syntax Error: Missing '=' in -> {line}"

            left, right = line.split('=', 1)

            left = left.strip()
            right = right.strip()

            # -------------------------
            # Left side (identifier)
            # -------------------------
            if not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', left):
                return f"Syntax Error: Invalid identifier -> {left}"

            # -------------------------
            # Right side empty
            # -------------------------
            if right == "":
                return f"Syntax Error: Missing expression -> {line}"

            tokens = right.split()

            # -------------------------
            # Expression must not end with operator
            # -------------------------
            if tokens[-1] in ['+', '-', '*', '/']:
                return f"Syntax Error: Incomplete expression -> {line}"

            # -------------------------
            # Pattern check
            # operand operator operand
            # -------------------------
            for i in range(len(tokens)):
                if i % 2 == 0:
                    # operand
                    if not (
                        tokens[i].isdigit() or
                        re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', tokens[i])
                    ):
                        return f"Syntax Error: Invalid operand -> {tokens[i]}"
                else:
                    # operator
                    if tokens[i] not in ['+', '-', '*', '/']:
                        return f"Syntax Error: Invalid operator -> {tokens[i]}"

        return "Parsing Successful"

    except Exception as e:
        return f"Parsing Error: {str(e)}"