def generate_TAC(code):
    try:
        tac = []
        temp_count = 1

        # Split using semicolon (IMPORTANT FIX)
        statements = code.split(';')

        for stmt in statements:
            line = stmt.strip()

            if not line:
                continue

            if '=' not in line:
                continue

            left, right = line.split('=', 1)
            left = left.strip()
            right = right.strip()

            tokens = right.split()

            # -------------------------
            # Case 1: Simple assignment
            # -------------------------
            if len(tokens) == 1:
                tac.append(f"{left} = {tokens[0]}")

            # -------------------------
            # Case 2: Binary operation
            # -------------------------
            elif len(tokens) == 3:
                a, op, b = tokens

                t = f"t{temp_count}"
                tac.append(f"{t} = {a} {op} {b}")
                tac.append(f"{left} = {t}")
                temp_count += 1

            # -------------------------
            # Case 3: Longer expression
            # -------------------------
            else:
                # safety check
                if len(tokens) % 2 == 0:
                    return [f"TAC Error: Invalid expression -> {line}"]

                current = tokens[0]
                i = 1

                while i < len(tokens):
                    op = tokens[i]

                    if i + 1 >= len(tokens):
                        return [f"TAC Error: Incomplete expression -> {line}"]

                    next_val = tokens[i + 1]

                    t = f"t{temp_count}"
                    tac.append(f"{t} = {current} {op} {next_val}")

                    current = t
                    temp_count += 1
                    i += 2

                tac.append(f"{left} = {current}")

        return tac

    except Exception as e:
        return [f"TAC Error: {str(e)}"]