// Vendored from tree-sitter-glimmer 0.0.1 because the published crate does
// not compile its external scanner in bindings/rust/build.rs.
#include "parser.h"
#include <wctype.h>

enum TokenType {
  COMMENT
};

void *tree_sitter_glimmer_external_scanner_create() { return NULL; }
void tree_sitter_glimmer_external_scanner_destroy(void *payload) { (void)payload; }
void tree_sitter_glimmer_external_scanner_reset(void *payload) { (void)payload; }
unsigned tree_sitter_glimmer_external_scanner_serialize(void *payload, char *buffer) {
    (void)payload;
    (void)buffer;
    return 0;
}
void tree_sitter_glimmer_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
    (void)payload;
    (void)buffer;
    (void)length;
}

static void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

static bool scan_html_comment(TSLexer *lexer) {
    if (lexer->lookahead != '!') return false;
    advance(lexer);
    if (lexer->lookahead != '-') return false;
    advance(lexer);
    if (lexer->lookahead != '-') return false;
    advance(lexer);

    unsigned dashes = 0;
    while (lexer->lookahead) {
        switch (lexer->lookahead) {
            case '-':
                ++dashes;
                break;
            case '>':
                if (dashes >= 2) {
                    lexer->result_symbol = COMMENT;
                    advance(lexer);
                    lexer->mark_end(lexer);
                    return true;
                }
            default:
                dashes = 0;
        }
        advance(lexer);
    }

    return false;
}

static bool scan_multi_line_handlebars_comment(TSLexer *lexer) {
    if (lexer->lookahead != '-') return false;

    unsigned dashes = 0;
    unsigned brackets = 0;
    while (lexer->lookahead) {
        switch (lexer->lookahead) {
            case '-':
                ++dashes;
                break;
            case '}':
                ++brackets;
                if (dashes >= 2 && brackets == 2) {
                    lexer->result_symbol = COMMENT;
                    advance(lexer);
                    lexer->mark_end(lexer);
                    return true;
                } else {
                    break;
                }
            default:
                dashes = 0;
                brackets = 0;
        }
        advance(lexer);
    }

    return false;
}

static bool scan_single_line_handlebars_comment(TSLexer *lexer) {
    unsigned brackets = 0;
    while (lexer->lookahead) {
        switch (lexer->lookahead) {
            case '}':
                ++brackets;
                if (brackets == 2) {
                    lexer->result_symbol = COMMENT;
                    advance(lexer);
                    lexer->mark_end(lexer);
                    return true;
                } else {
                    break;
                }
            default:
                brackets = 0;
        }
        advance(lexer);
    }

    return false;
}

static bool scan_handlebars_comment(TSLexer *lexer) {
    if (lexer->lookahead != '{') return false;
    advance(lexer);
    if (lexer->lookahead != '!') return false;
    advance(lexer);

    switch (lexer->lookahead) {
        case '-':
            advance(lexer);
            return scan_multi_line_handlebars_comment(lexer);
        default:
            advance(lexer);
            return scan_single_line_handlebars_comment(lexer);
    }
}

bool tree_sitter_glimmer_external_scanner_scan(
	void *payload,
	TSLexer *lexer,
	const bool *valid_symbols
) {
    (void)payload;

    while (iswspace(lexer->lookahead)) {
      lexer->advance(lexer, true);
    }

    if (valid_symbols[COMMENT]) {
        switch (lexer->lookahead) {
            case '<':
                lexer->mark_end(lexer);
                advance(lexer);
                return scan_html_comment(lexer);
            case '{':
                lexer->mark_end(lexer);
                advance(lexer);
                return scan_handlebars_comment(lexer);
            default:
                return false;
      }
  }

  return false;
}
