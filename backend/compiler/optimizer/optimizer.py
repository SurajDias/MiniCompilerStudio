def optimize(tac_code):
    try:
        values = {}
        final_output = []

        for line in tac_code:

            if '=' not in line:
                continue

            parts = line.split('=')
            if len(parts) < 2:
                continue

            left = parts[0].strip()
            right = parts[1].strip()

            tokens = right.split()

            # -------------------------
            # Constant Folding
            # -------------------------
            if len(tokens) == 3:
                a, op, b = tokens

                if a.isdigit() and b.isdigit():
                    if op == '+':
                        result = int(a) + int(b)
                    elif op == '-':
                        result = int(a) - int(b)
                    elif op == '*':
                        result = int(a) * int(b)
                    elif op == '/':
                        result = int(a) // int(b)
                    else:
                        result = right

                    values[left] = str(result)
                    continue

            # -------------------------
            # Algebraic Simplification
            # -------------------------
            if len(tokens) == 3:
                a, op, b = tokens

                if op == '+' and b == '0':
                    values[left] = a
                    continue

                if op == '*' and b == '1':
                    values[left] = a
                    continue

            # -------------------------
            # Value Propagation (SMART)
            # -------------------------
            if right in values:
                # If temp variable → resolve fully
                if right.startswith('t'):
                    values[left] = values[right]
                else:
                    values[left] = right
            else:
                values[left] = right

        # -------------------------
        # Final Clean Output
        # -------------------------
        for var, val in values.items():
            if not var.startswith('t'):
                final_output.append(f"{var} = {val}")

        return final_output

    except Exception as e:
        return [f"Optimization Error: {str(e)}"]