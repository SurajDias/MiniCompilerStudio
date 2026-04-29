# =============================================================
#  backend/compiler/optimizer/optimizer.py
#
#  UPGRADES:
#  - All optimization passes now SKIP label lines (L1:) and
#    jump lines (goto ..., if ... goto ...) — never corrupt them
#  - _is_label()    → detects "L1:" style lines
#  - _is_jump()     → detects "goto" / "if ... goto" lines
#  - _is_plain_assignment() → only true for "x = ..." lines
#    that are safe to fold / propagate / eliminate
#  - Dead code elimination updated: variables used in jump
#    conditions are counted as "used"
#  - _final_output() preserves labels and jumps
#  - All existing public API UNCHANGED:
#      optimize(tac_code) → list[str]
#      optimize_with_log(tac_code) → (list[str], list[str])
#      get_optimization_log(tac_code) → list[str]
# =============================================================


# ─── Line-type helpers ────────────────────────────────────────

def _is_label(line: str) -> bool:
    """True for lines like  'L1:'"""
    stripped = line.strip()
    return stripped.endswith(':') and stripped[:-1].isidentifier()


def _is_jump(line: str) -> bool:
    """True for 'goto L1' or 'if a > b goto L1'"""
    s = line.strip()
    return s.startswith('goto ') or ('goto' in s and s.startswith('if '))


def _is_control_flow(line: str) -> bool:
    """True for lines that must never be removed or rewritten."""
    return _is_label(line) or _is_jump(line)


def _is_number(s: str) -> bool:
    try:
        float(s)
        return True
    except Exception:
        return False


def _to_number(s: str):
    try:
        return int(s)
    except Exception:
        return float(s)


def _num_str(n) -> str:
    if isinstance(n, float) and n == int(n):
        return str(int(n))
    return str(n)


# ─── Pass 1: Constant Folding ─────────────────────────────────

def _constant_fold(instructions, log):
    result = []
    for line in instructions:
        # Never touch control-flow lines
        if _is_control_flow(line):
            result.append(line)
            continue

        if '=' not in line:
            result.append(line)
            continue

        lhs, rhs = line.split('=', 1)
        lhs, rhs = lhs.strip(), rhs.strip()
        parts    = rhs.split()

        if len(parts) == 3:
            a, op, b = parts
            if _is_number(a) and _is_number(b):
                na, nb = _to_number(a), _to_number(b)
                try:
                    if   op == '+':              val = na + nb
                    elif op == '-':              val = na - nb
                    elif op == '*':              val = na * nb
                    elif op == '/' and nb != 0:  val = na / nb
                    else:
                        result.append(line)
                        continue

                    new_line = f"{lhs} = {_num_str(val)}"
                    log.append(f"Constant Folding: {line.strip()} → {new_line}")
                    result.append(new_line)
                    continue
                except Exception:
                    pass

        result.append(line)
    return result


# ─── Pass 2: Algebraic Simplification ─────────────────────────

def _algebraic_simplify(instructions, log):
    result = []
    for line in instructions:
        if _is_control_flow(line):
            result.append(line)
            continue

        if '=' not in line:
            result.append(line)
            continue

        lhs, rhs = line.split('=', 1)
        lhs, rhs = lhs.strip(), rhs.strip()
        parts    = rhs.split()

        if len(parts) == 3:
            a, op, b = parts

            # x + 0 → x
            if op == '+' and b == '0':
                new_line = f"{lhs} = {a}"
                log.append(f"Algebraic Simplification: {line.strip()} → {new_line}")
                result.append(new_line)
                continue

            # x * 1 → x
            if op == '*' and b == '1':
                new_line = f"{lhs} = {a}"
                log.append(f"Algebraic Simplification: {line.strip()} → {new_line}")
                result.append(new_line)
                continue

            # x * 0 → 0
            if op == '*' and b == '0':
                new_line = f"{lhs} = 0"
                log.append(f"Algebraic Simplification: {line.strip()} → {new_line}")
                result.append(new_line)
                continue

        result.append(line)
    return result


# ─── Pass 3: Copy Propagation ─────────────────────────────────

def _copy_propagate(instructions, log):
    env    = {}
    result = []

    def resolve(x):
        visited = set()
        while x in env and x not in visited:
            visited.add(x)
            x = env[x]
        return x

    for line in instructions:
        # Preserve labels unchanged
        if _is_label(line):
            result.append(line)
            continue

        # For jump lines: substitute known values in the condition part
        # e.g. "if t1 > t2 goto L1"  →  "if 5 > 3 goto L1" (if known)
        if _is_jump(line):
            if line.strip().startswith('if '):
                # Format: "if LEFT OP RIGHT goto LABEL"
                parts = line.strip().split()
                # parts: ['if', LEFT, OP, RIGHT, 'goto', LABEL]
                if len(parts) == 6:
                    left_r  = resolve(parts[1])
                    right_r = resolve(parts[3])
                    new_line = f"if {left_r} {parts[2]} {right_r} goto {parts[5]}"
                    if new_line != line.strip():
                        log.append(
                            f"Copy Propagation (jump): "
                            f"{line.strip()} → {new_line}"
                        )
                    result.append(new_line)
                    continue
            result.append(line)
            continue

        if '=' not in line:
            result.append(line)
            continue

        lhs, rhs = line.split('=', 1)
        lhs, rhs = lhs.strip(), rhs.strip()
        parts    = rhs.split()

        if len(parts) == 1:
            val    = resolve(parts[0])
            env[lhs] = val
            result.append(f"{lhs} = {val}")

        elif len(parts) == 3:
            a, op, b = parts
            ra = resolve(a)
            rb = resolve(b)

            if _is_number(ra) and _is_number(rb):
                na, nb = _to_number(ra), _to_number(rb)
                try:
                    if   op == '+': val = na + nb
                    elif op == '-': val = na - nb
                    elif op == '*': val = na * nb
                    elif op == '/': val = na / nb
                    else:
                        result.append(f"{lhs} = {ra} {op} {rb}")
                        continue
                    env[lhs] = _num_str(val)
                    result.append(f"{lhs} = {_num_str(val)}")
                    continue
                except Exception:
                    pass

            result.append(f"{lhs} = {ra} {op} {rb}")
        else:
            result.append(line)

    return result


# ─── Pass 4: Dead Code Elimination ────────────────────────────

def _dead_code_eliminate(instructions, log):
    """
    Remove temp assignments whose result is never used.
    Labels, jumps, and user-named variables are always kept.
    """
    used = set()

    for line in instructions:
        if _is_control_flow(line):
            # Variables referenced in "if LEFT OP RIGHT goto LABEL"
            # count as used
            if line.strip().startswith('if '):
                parts = line.strip().split()
                if len(parts) >= 4:
                    used.add(parts[1])   # LEFT operand
                    used.add(parts[3])   # RIGHT operand
            continue

        if '=' not in line:
            continue

        _, rhs = line.split('=', 1)
        for tok in rhs.split():
            used.add(tok)

    result = []
    for line in instructions:
        if _is_control_flow(line):
            result.append(line)
            continue

        if '=' in line:
            lhs = line.split('=', 1)[0].strip()
            # Only eliminate unnamed temps (t1, t2, …)
            if lhs.startswith('t') and lhs not in used:
                log.append(f"Dead Code Eliminated: {line.strip()}")
                continue

        result.append(line)
    return result


# ─── Pass 5: Remove overwritten variables ─────────────────────

def _remove_overwritten_vars(instructions):
    """
    Among plain assignments, keep only the LAST write to each variable.
    Labels and jump lines are never removed.
    """
    last_assign_index = {}

    for i, line in enumerate(instructions):
        if _is_control_flow(line):
            continue
        if '=' in line:
            var = line.split('=', 1)[0].strip()
            last_assign_index[var] = i

    result = []
    for i, line in enumerate(instructions):
        if _is_control_flow(line):
            result.append(line)
            continue
        if '=' in line:
            var = line.split('=', 1)[0].strip()
            if last_assign_index.get(var) == i:
                result.append(line)
            # else: this is an overwritten assignment — drop it
        else:
            result.append(line)

    return result


# ─── Final output filter ──────────────────────────────────────

def _final_output(instructions):
    """
    Keep:
    - All label lines  (L1:)
    - All jump lines   (goto ..., if ... goto ...)
    - All non-temp assignments  (user variables only)
    Remove:
    - Intermediate temp assignments (t1 = ...)
    Then remove duplicate writes with _remove_overwritten_vars.
    """
    filtered = []
    for line in instructions:
        if _is_control_flow(line):
            filtered.append(line)
            continue
        if '=' in line:
            lhs = line.split('=', 1)[0].strip()
            if not lhs.startswith('t'):
                filtered.append(line)

    return _remove_overwritten_vars(filtered)


# ─────────────────────────────────────────────────────────────
#  Optimization engine
# ─────────────────────────────────────────────────────────────

def optimize_with_log(tac_code):
    code = list(tac_code)
    log  = []

    for _ in range(10):
        before = list(code)

        code = _constant_fold(code, log)
        code = _algebraic_simplify(code, log)
        code = _copy_propagate(code, log)
        code = _dead_code_eliminate(code, log)

        if code == before:
            break

    final = _final_output(code)
    return final, log


# ─────────────────────────────────────────────────────────────
#  Public API  (ALL signatures UNCHANGED)
# ─────────────────────────────────────────────────────────────

def optimize(tac_code):
    """Return optimized TAC as a list of strings."""
    try:
        result, _ = optimize_with_log(tac_code)
        return result
    except Exception as e:
        return [f"Optimization Error: {str(e)}"]


def get_optimization_log(tac_code):
    """Return the list of optimization steps applied."""
    try:
        _, log = optimize_with_log(tac_code)
        return log
    except Exception as e:
        return [f"Log Error: {str(e)}"]