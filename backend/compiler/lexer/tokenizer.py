# =============================================================
#  backend/compiler/lexer/tokenizer.py
#
#  UPGRADES:
#  - Added COMPARISON operators: ==, !=, <=, >=, <, >
#  - Added LOGICAL operators: &&, ||
#  - Multi-char operators parsed correctly (== before =)
#  - if / else / while remain as KEYWORD tokens
#  - tokenize() and tokenize_full() signatures UNCHANGED
# =============================================================

import re
from dataclasses import dataclass
from typing import List


# ─── Token dataclass ──────────────────────────────────────────

@dataclass
class Token:
    type:  str
    value: str
    line:  int
    col:   int

    def __repr__(self):
        return f"Token({self.type}, {self.value!r}, L{self.line}:C{self.col})"


# ─── Token specification ──────────────────────────────────────
# ORDER MATTERS: longer / more-specific patterns must come first.

_TOKEN_SPEC = [
    ('KEYWORD',    r'\b(int|float|char|double|if|else|while|return)\b'),
    ('FLOAT',      r'\d+\.\d+'),           # before NUMBER
    ('NUMBER',     r'\d+'),
    ('ID',         r'[A-Za-z_][A-Za-z0-9_]*'),
    # Multi-char operators before single-char
    ('COMPARE',    r'==|!=|<=|>=|<|>'),    # NEW: comparison ops
    ('LOGICAL',    r'&&|\|\|'),            # NEW: logical ops
    ('OP',         r'[+\-*/=!]'),          # single-char arithmetic / assign
    ('LPAREN',     r'\('),
    ('RPAREN',     r'\)'),
    ('LBRACE',     r'\{'),
    ('RBRACE',     r'\}'),
    ('SEPARATOR',  r'[;,]'),
    ('SKIP',       r'[ \t\n\r]'),
    ('MISMATCH',   r'.'),
]

_TOK_REGEX = '|'.join(f'(?P<{name}>{pat})' for name, pat in _TOKEN_SPEC)


# ─── Display name mapping ─────────────────────────────────────

_DISPLAY = {
    'KEYWORD':   'KEYWORD',
    'FLOAT':     'FLOAT',
    'NUMBER':    'NUMBER',
    'ID':        'IDENTIFIER',
    'COMPARE':   'COMPARE_OP',
    'LOGICAL':   'LOGICAL_OP',
    'OP':        'OPERATOR',
    'LPAREN':    'LPAREN',
    'RPAREN':    'RPAREN',
    'LBRACE':    'LBRACE',
    'RBRACE':    'RBRACE',
    'SEPARATOR': 'SEPARATOR',
    'MISMATCH':  'INVALID',
}


def tokenize_full(code: str) -> List[Token]:
    """
    Returns structured Token objects with line and column info.
    Used internally by the parser, TAC generator, and semantic analyser.
    """
    tokens     = []
    line       = 1
    line_start = 0

    for match in re.finditer(_TOK_REGEX, code):
        kind  = match.lastgroup
        value = match.group()
        col   = match.start() - line_start + 1

        if kind == 'SKIP':
            if '\n' in value:
                line      += value.count('\n')
                line_start = match.end()
            continue

        tokens.append(Token(type=kind, value=value, line=line, col=col))

    return tokens


def tokenize(code: str) -> List[str]:
    """
    Returns human-readable token strings.
    Format: "value -> TYPE  [L:C]"
    Backward-compatible with routes.py.
    """
    result = []
    for tok in tokenize_full(code):
        display = _DISPLAY.get(tok.type, tok.type)
        result.append(f"{tok.value} -> {display}  [L{tok.line}:C{tok.col}]")
    return result