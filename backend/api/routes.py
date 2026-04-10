from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import psutil   # ✅ real system metrics

from backend.compiler.lexer.tokenizer import tokenize
from backend.compiler.parser.parser import parse
from backend.compiler.intermediate.tac import generate_TAC
from backend.compiler.optimizer.optimizer import optimize

app = Flask(__name__)
CORS(app)


@app.route('/')
def home():
    return "Mini Compiler API is running 🚀"


# ─────────────────────────────────────────────
# COMPILE ROUTE
# ─────────────────────────────────────────────
@app.route('/compile', methods=['POST'])
def compile_code():
    try:
        data = request.get_json(silent=True)
        code = data.get('code', '') if data else ''

        tokens = tokenize(code)
        syntax = parse(code)

        if "Error" in syntax:
            tac = []
            optimized = []
        else:
            tac = generate_TAC(code)
            optimized = optimize(tac)

        return jsonify({
            "tokens": tokens,
            "syntax": syntax,
            "tac": tac,
            "optimized": optimized
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# DEBUG ROUTE
# ─────────────────────────────────────────────
@app.route('/debug', methods=['POST'])
def debug_code():
    try:
        data = request.get_json(silent=True)
        code = data.get('code', '') if data else ''

        lines = code.split('\n')
        errors = []
        fixed_lines = lines.copy()

        for i, line in enumerate(lines):
            if "string" in line and "readInt32" in line:
                errors.append({
                    "line": i,
                    "message": "Type mismatch: expected int32 but got string",
                    "suggestion": "Change string to int32"
                })

                fixed_lines[i] = line.replace("string", "int32")

                if i > 0 and "ERROR" in fixed_lines[i - 1]:
                    fixed_lines[i - 1] = "// RESOLVED: Type aligned"

        fixed_code = "\n".join(fixed_lines)

        return jsonify({
            "error": len(errors) > 0,
            "errors": errors,
            "message": "Multiple issues found" if errors else "No issues found",
            "fixed_code": fixed_code
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# TELEMETRY ROUTE (🔥 REAL VERSION)
# ─────────────────────────────────────────────
@app.route('/telemetry', methods=['POST'])
def telemetry():
    try:
        data = request.get_json(silent=True)
        code = data.get('code', '') if data else ''

        stage_times = {}
        pipeline_start = time.perf_counter()

        # ── Lexer ──
        t0 = time.perf_counter()
        tokens = tokenize(code)
        stage_times['lexer'] = round((time.perf_counter() - t0) * 1000, 4)

        # ── Parser ──
        t0 = time.perf_counter()
        syntax = parse(code)
        stage_times['parser'] = round((time.perf_counter() - t0) * 1000, 4)

        # ── Semantic (placeholder) ──
        t0 = time.perf_counter()
        _ = parse(code)
        stage_times['semantic'] = round((time.perf_counter() - t0) * 1000, 4)

        # ── TAC ──
        t0 = time.perf_counter()
        tac = generate_TAC(code) if "Error" not in syntax else []
        stage_times['tac'] = round((time.perf_counter() - t0) * 1000, 4)

        # ── Optimizer ──
        t0 = time.perf_counter()
        optimized = optimize(tac) if tac else []
        stage_times['optimizer'] = round((time.perf_counter() - t0) * 1000, 4)

        total_ms = round((time.perf_counter() - pipeline_start) * 1000, 4)

        # ── REAL SYSTEM METRICS ──
        cpu_usage = psutil.cpu_percent(interval=0.1)
        memory_usage = psutil.virtual_memory().percent

        return jsonify({
            "cpu": cpu_usage,
            "memory": memory_usage,
            "latency": total_ms,
            "stages": stage_times
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)