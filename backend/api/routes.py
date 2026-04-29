from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import psutil

from backend.compiler.lexer.tokenizer import tokenize
from backend.compiler.parser.parser import parse
from backend.compiler.intermediate.tac import generate_TAC
from backend.compiler.optimizer.optimizer import optimize

app = Flask(__name__)
CORS(app)


# ─────────────────────────────────────────────
# ✅ CLEAN PREPROCESSOR
#    - Strips headers, main(), return, datatypes
#    - Strips standalone braces left by main()
#    - Does NOT touch while / if / else blocks
#    - Parser handles all control flow natively
# ─────────────────────────────────────────────
def preprocess_c_code(code: str) -> str:
    lines = code.split('\n')
    cleaned = []

    # Track whether we are inside int main() { ... }
    # so we can drop the outer braces of main only.
    inside_main   = False
    main_depth    = 0   # brace depth relative to the opening '{' of main

    for line in lines:
        stripped = line.strip()

        # ── Skip blank lines ──────────────────────────────────
        if not stripped:
            continue

        # ── Strip inline comments ─────────────────────────────
        if '//' in stripped:
            stripped = stripped.split('//')[0].strip()
        if not stripped:
            continue

        # ── Drop preprocessor directives (#include, #define …) ─
        if stripped.startswith('#'):
            continue

        # ── Drop  int main() / int main(void) / int main(…) ───
        if stripped.startswith('int main'):
            inside_main = True
            main_depth  = 0
            # Count any '{' on the same line as main
            main_depth += stripped.count('{') - stripped.count('}')
            continue

        # ── While inside main's outer braces, manage depth ────
        if inside_main:
            open_b  = stripped.count('{')
            close_b = stripped.count('}')
            main_depth += open_b - close_b

            if main_depth < 0:
                # This '}' closes main itself — drop it, we're done
                inside_main = False
                main_depth  = 0
                continue

            # main_depth == 0 after a net-zero line means the lone
            # closing '}' of main was already consumed above;
            # a line that is just '}' and brings depth to 0 from 1
            # is the closing brace of main — drop it.
            if stripped == '}' and main_depth == 0:
                inside_main = False
                continue

        # ── Drop  return …; ───────────────────────────────────
        if stripped.startswith('return'):
            continue

        # ── Strip leading datatype keywords ───────────────────
        for dtype in ('int ', 'float ', 'double ', 'char '):
            if stripped.startswith(dtype):
                stripped = stripped[len(dtype):]
                break           # only strip one datatype prefix

        cleaned.append(stripped)

    return '\n'.join(cleaned)


# ─────────────────────────────────────────────
# HOME
# ─────────────────────────────────────────────
@app.route('/')
def home():
    return "Mini Compiler API is running 🚀"


# ─────────────────────────────────────────────
# COMPILE
# ─────────────────────────────────────────────
@app.route('/compile', methods=['POST'])
def compile_code():
    try:
        data   = request.get_json(silent=True)
        code   = data.get('code', '') if data else ''

        code   = preprocess_c_code(code)

        tokens = tokenize(code)
        syntax = parse(code)

        if "Error" in syntax:
            tac       = []
            optimized = []
        else:
            tac       = generate_TAC(code)
            optimized = optimize(tac)

        return jsonify({
            "tokens":    tokens,
            "syntax":    syntax,
            "tac":       tac,
            "optimized": optimized
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# DEBUG
# ─────────────────────────────────────────────
@app.route('/debug', methods=['POST'])
def debug_code():
    try:
        data  = request.get_json(silent=True)
        code  = data.get('code', '') if data else ''

        code  = preprocess_c_code(code)

        lines       = code.split('\n')
        errors      = []
        fixed_lines = lines.copy()

        for i, line in enumerate(lines):
            if "string" in line and "readInt32" in line:
                errors.append({
                    "line":       i,
                    "message":    "Type mismatch: expected int32 but got string",
                    "suggestion": "Change string to int32"
                })
                fixed_lines[i] = line.replace("string", "int32")

        fixed_code = "\n".join(fixed_lines)

        return jsonify({
            "error":      len(errors) > 0,
            "errors":     errors,
            "message":    "Multiple issues found" if errors else "No issues found",
            "fixed_code": fixed_code
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# TELEMETRY
# ─────────────────────────────────────────────
@app.route('/telemetry', methods=['POST'])
def telemetry():
    try:
        data  = request.get_json(silent=True)
        code  = data.get('code', '') if data else ''

        code  = preprocess_c_code(code)

        stage_times    = {}
        pipeline_start = time.perf_counter()

        t0 = time.perf_counter()
        tokens = tokenize(code)
        stage_times['lexer'] = round((time.perf_counter() - t0) * 1000, 4)

        t0 = time.perf_counter()
        syntax = parse(code)
        stage_times['parser'] = round((time.perf_counter() - t0) * 1000, 4)

        t0 = time.perf_counter()
        tac = generate_TAC(code) if "Error" not in syntax else []
        stage_times['tac'] = round((time.perf_counter() - t0) * 1000, 4)

        t0 = time.perf_counter()
        optimized = optimize(tac) if tac else []
        stage_times['optimizer'] = round((time.perf_counter() - t0) * 1000, 4)

        total_ms = round((time.perf_counter() - pipeline_start) * 1000, 4)

        cpu_usage    = psutil.cpu_percent(interval=0.1)
        memory_usage = psutil.virtual_memory().percent

        return jsonify({
            "cpu":     cpu_usage,
            "memory":  memory_usage,
            "latency": total_ms,
            "stages":  stage_times
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# RUN
# ─────────────────────────────────────────────
if __name__ == '__main__':
    app.run(debug=True)