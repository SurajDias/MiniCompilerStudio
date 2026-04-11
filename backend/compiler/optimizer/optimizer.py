# =============================================================
#  backend/compiler/optimizer/optimizer.py
#
#  ROOT BUG FIXED:
#  ─────────────────────────────────────────────────────────────
#  Previous _copy_propagate() stored multi-token expressions
#  in env, e.g.  env['t2'] = "5 * 4"
#
#  When t2 appeared as an operand later:
#    t3 = t2 - 5
#  became:
#    t3 = 5 * 4 - 5        ← 5 tokens on RHS
#
#  _constant_fold() only handles exactly 3 tokens → couldn't
#  fold it → multi-pass loop couldn't make progress → WRONG.
#
#  THE FIX:
#  _copy_propagate() now only stores SCALAR values in env
#  (single numbers or single variable names, never expressions).
#  If the RHS is a binary expression after substitution, we
#  leave it in the instruction list for the folding pass to
#  evaluate on the next iteration.
#
#  RESULT (a = 2+3; b = a*4; c = b-5):
#  ─────────────────────────────────────
#  Pass 1:  t1=5, t2=5*4, t3=t2-5, a=5, b=t2, c=t3
#  Pass 2:  t2=20, t3=20-5, b=20, c=t3
#  Pass 3:  t3=15, c=15
#  Pass 4:  no change → stop
#  Final:   a=5  b=20  c=15  ✓
#
#  FOUR OPTIMIZATION PASSES (unchanged names/purpose):
#  ─────────────────────────────────────────────────────────────
#  Pass 1 — Constant Folding
#    Evaluate arithmetic when both operands are numeric literals.
#    Example: t1 = 2 * 3  →  t1 = 6
#
#  Pass 2 — Algebraic Simplification
#    Identity/zero rules: a+0→a, a*1→a, a*0→0, etc.
#
#  Pass 3 — Copy Propagation  ← BUG WAS HERE
#    Substitute known SCALAR values into later instructions.
#    Stores only single-token values in env (numbers or vars).
#
#  Pass 4 — Dead Code Elimination
#    Remove unused temp variables.
# =============================================================


# ─── Utilities ────────────────────────────────────────────────

def _is_number(s: str) -> bool:
    try:
        float(s)
        return True
    except (ValueError, TypeError):
        return False

def _to_number(s: str):
    try:
        return int(s)
    except ValueError:
        return float(s)

def _num_str(n) -> str:
    """Format number cleanly: drop trailing .0 for whole floats."""
    if isinstance(n, float) and n == int(n):
        return str(int(n))
    return str(n)


# ─── Pass 1: Constant Folding ─────────────────────────────────

def _constant_fold(instructions: list[str], log: list[str]) -> list[str]:
    """
    Evaluate arithmetic when both operands are numeric literals.
    Handles exactly 3 tokens on RHS: a op b
    Example:  t1 = 5 * 4  →  t1 = 20
    """
    result = []
    for line in instructions:
        if '=' not in line:
            result.append(line)
            continue

        lhs, rhs = line.split('=', 1)
        lhs, rhs = lhs.strip(), rhs.strip()
        parts = rhs.split()

        if len(parts) == 3:
            a, op, b = parts
            if _is_number(a) and _is_number(b):
                na, nb = _to_number(a), _to_number(b)
                try:
                    if   op == '+': val = na + nb
                    elif op == '-': val = na - nb
                    elif op == '*': val = na * nb
                    elif op == '/':
                        if nb == 0:
                            result.append(line)
                            continue
                        val = (na // nb
                               if isinstance(na, int) and isinstance(nb, int)
                               else na / nb)
                    else:
                        result.append(line)
                        continue

                    new_line = f"{lhs} = {_num_str(val)}"
                    if new_line != line:
                        log.append(
                            f"Constant Folding:         "
                            f"{lhs} = {a} {op} {b}  →  {lhs} = {_num_str(val)}"
                        )
                    result.append(new_line)
                    continue
                except Exception:
                    pass

        result.append(line)
    return result


# ─── Pass 2: Algebraic Simplification ─────────────────────────

def _algebraic_simplify(instructions: list[str], log: list[str]) -> list[str]:
    """
    Identity and zero rules — always safe regardless of variable value.
      a + 0 → a,  0 + a → a,  a - 0 → a
      a * 1 → a,  1 * a → a,  a / 1 → a
      a * 0 → 0,  0 * a → 0
    """
    result = []
    for line in instructions:
        if '=' not in line:
            result.append(line)
            continue

        lhs, rhs = line.split('=', 1)
        lhs, rhs = lhs.strip(), rhs.strip()
        parts = rhs.split()

        if len(parts) == 3:
            a, op, b = parts
            simplified = None

            if   op == '+' and b == '0':               simplified = a
            elif op == '+' and a == '0':               simplified = b
            elif op == '-' and b == '0':               simplified = a
            elif op == '*' and b == '1':               simplified = a
            elif op == '*' and a == '1':               simplified = b
            elif op == '/' and b == '1':               simplified = a
            elif op == '*' and (a == '0' or b == '0'): simplified = '0'

            if simplified is not None:
                new_line = f"{lhs} = {simplified}"
                if new_line != line:
                    log.append(
                        f"Algebraic Simplification: "
                        f"{lhs} = {a} {op} {b}  →  {lhs} = {simplified}"
                    )
                result.append(new_line)
                continue

        result.append(line)
    return result


# ─── Pass 3: Copy Propagation ─────────────────────────────────

def _copy_propagate(instructions: list[str], log: list[str]) -> list[str]:
    """
    Substitute known SCALAR values into later instructions.

    KEY RULE (the bug fix):
    ───────────────────────
    env only stores a value for 'lhs' when the resolved RHS is a
    SINGLE token (a number or a variable name).

    It does NOT store multi-token expressions like "5 * 4" in env.
    Those stay as instructions and get folded by Pass 1 on the
    next iteration.

    WHY THIS MATTERS:
      If env['t2'] = "5 * 4"  (old buggy behaviour)
      and the next line is  t3 = t2 - 5
      substitution gives    t3 = 5 * 4 - 5   ← 5 tokens, unfoldable

      With the fix:
      env stores t2 only after it becomes '20' (via folding)
      and then    t3 = t2 - 5  →  t3 = 20 - 5  ← foldable next pass ✓
    """
    # env maps variable name → single scalar string (number or var)
    env: dict[str, str] = {}
    result = []

    def resolve(name: str) -> str:
        """
        Follow the chain: t1 → '5', b → '20', etc.
        Stop if the chain leads back to itself (cycle guard)
        or if the value is not in env.
        """
        seen = set()
        while name in env and name not in seen:
            seen.add(name)
            name = env[name]
        return name

    for line in instructions:
        if '=' not in line:
            result.append(line)
            continue

        lhs, rhs = line.split('=', 1)
        lhs, rhs = lhs.strip(), rhs.strip()
        parts = rhs.split()

        if len(parts) == 1:
            # Simple copy: lhs = rhs
            # Resolve rhs as far as possible, then store in env
            resolved = resolve(rhs)
            env[lhs] = resolved          # ← always a scalar
            new_line = f"{lhs} = {resolved}"
            if new_line != line:
                log.append(f"Copy Propagation:         {line.strip()}  →  {new_line}")
            result.append(new_line)

        elif len(parts) == 3:
            a, op, b = parts
            ra = resolve(a)
            rb = resolve(b)
            new_line = f"{lhs} = {ra} {op} {rb}"

            # ── KEY FIX ──────────────────────────────────────
            # Only record lhs in env if we can fold it right now
            # (both operands are already numbers).
            # If not, leave it out of env — the loop will fold
            # the result on a later pass, and THEN propagate it.
            if _is_number(ra) and _is_number(rb):
                # Do an immediate fold so env gets the scalar
                na, nb = _to_number(ra), _to_number(rb)
                try:
                    if   op == '+': val = na + nb
                    elif op == '-': val = na - nb
                    elif op == '*': val = na * nb
                    elif op == '/' and nb != 0:
                        val = (na // nb
                               if isinstance(na, int) and isinstance(nb, int)
                               else na / nb)
                    else:
                        val = None

                    if val is not None:
                        folded_line = f"{lhs} = {_num_str(val)}"
                        if folded_line != line:
                            log.append(
                                f"Constant Folding:         "
                                f"{lhs} = {ra} {op} {rb}  →  {lhs} = {_num_str(val)}"
                            )
                        env[lhs] = _num_str(val)   # scalar → safe to propagate
                        result.append(folded_line)
                        continue
                except Exception:
                    pass

            # Could not fold immediately — emit the substituted form
            # (do NOT store in env — wait for next pass to fold it)
            if new_line != line:
                log.append(f"Copy Propagation:         {line.strip()}  →  {new_line}")
            result.append(new_line)

        else:
            # Unexpected token count — pass through unchanged
            result.append(line)

    return result


# ─── Pass 4: Dead Code Elimination ────────────────────────────

def _dead_code_eliminate(instructions: list[str], log: list[str]) -> list[str]:
    """
    Remove assignments to temp variables (t1, t2, …) that are
    never referenced on the RHS of any instruction.

    Example:
      t3 = 15   and t3 is never used anywhere else → DEAD → removed
    """
    used: set[str] = set()
    for line in instructions:
        if '=' not in line:
            continue
        _, rhs = line.split('=', 1)
        for tok in rhs.split():
            if not any(c in tok for c in '+-*/'):
                used.add(tok)

    result = []
    for line in instructions:
        if '=' not in line:
            result.append(line)
            continue
        lhs = line.split('=', 1)[0].strip()
        if lhs.startswith('t') and lhs not in used:
            log.append(f"Dead Code Eliminated:     {lhs} (unused temp removed)")
        else:
            result.append(line)

    return result


# ─── Final clean-up ───────────────────────────────────────────

def _final_output(instructions: list[str]) -> list[str]:
    """
    Remove all remaining temp-variable lines.
    User only sees:  a = 5,  b = 20,  c = 15
    """
    return [
        line for line in instructions
        if '=' in line and not line.split('=')[0].strip().startswith('t')
    ]


# ─────────────────────────────────────────────────────────────
#  Multi-pass fixed-point engine
# ─────────────────────────────────────────────────────────────

def optimize_with_log(tac_code: list[str]) -> tuple[list[str], list[str]]:
    """
    Run all passes in a loop until a full round produces no change.
    This is called a "fixed-point" iteration.

    TRACE for  a = 2+3; b = a*4; c = b-5
    ──────────────────────────────────────
    Initial TAC:
      t1 = 2 + 3
      a  = t1
      t2 = a * 4
      b  = t2
      t3 = b - 5
      c  = t3

    Pass 1:  t1=5, a=5, t2=5*4→20, b=20, t3=20-5→15, c=15
    Pass 2:  no change → STOP

    Final: a=5  b=20  c=15  ✓
    """
    code = list(tac_code)
    log: list[str] = []
    MAX_PASSES = 20   # safety cap

    for _ in range(MAX_PASSES):
        before = list(code)

        code = _constant_fold(code, log)
        code = _algebraic_simplify(code, log)
        code = _copy_propagate(code, log)
        code = _dead_code_eliminate(code, log)

        if code == before:
            break   # fixed point reached

    final = _final_output(code)
    return (final if final else ["No optimizable statements found."]), log


# ─────────────────────────────────────────────────────────────
#  Public API  (signature unchanged)
# ─────────────────────────────────────────────────────────────

def optimize(tac_code: list[str]) -> list[str]:
    """
    Called by routes.py.
    Returns only the optimized lines (no log) — backward compat.
    """
    try:
        optimized, _ = optimize_with_log(tac_code)
        return optimized
    except Exception as e:
        return [f"Optimization Error: {str(e)}"]


def get_optimization_log(tac_code: list[str]) -> list[str]:
    """
    Optional helper for /telemetry or future routes.
    Returns the step-by-step explanation log only.
    """
    try:
        _, log = optimize_with_log(tac_code)
        return log
    except Exception as e:
        return [f"Log Error: {str(e)}"]