---
name: semantic-compression
description: Remove grammatical scaffolding LLMs can reconstruct while preserving meaning-carrying content. Use when compressing text for prompts, reducing token count, preparing context for LLM input, or making documentation more token-efficient. Applies LLM-aware compression rules that delete predictable grammar while preserving semantics.
---

# Semantic Compression

LLMs predict grammar from content words. Remove what's predictable; keep what's not.

## Deletion Tiers

**Tier 1 — Always delete:**
- Articles: a, an, the
- Copulas: is, are, was, were, am, be, been, being
- Expletive subjects: "There is/are...", "It is..."
- Pure intensifiers: very, quite, rather, really, extremely, somewhat
- Filler phrases: "in order to" → to, "due to the fact that" → because, "in terms of" → delete

**Tier 2 — Delete when recoverable from context:**
- Auxiliary verbs: have/has/had (keep with perfect aspect that matters), do/does/did
- Pronouns: it, this, that, these, those (when referent obvious)
- Relative pronouns: which, that, who (when clause structure clear)
- Infinitive "to" before verbs

**Tier 3 — Delete only when meaning preserved:**
- Prepositions: of, for, to, in, on, at
- DELETE: "system for processing" → "system processing"
- KEEP: "made from wood" (material), "ran from danger" (direction)

## Always Preserve

- Nouns, main verbs, meaningful adjectives/adverbs
- Numbers, quantifiers: "at least 5", "approximately", "more than"
- Uncertainty markers: "appears", "seems", "reportedly", "what sounded like"
- Negation: not, no, never, without, none
- Temporal markers: dates, frequencies, durations
- Causality: because, therefore, despite, although
- Proper nouns, titles, technical terms
- Prepositions encoding relationships: from/to (direction), with/without (inclusion), between, among

## Structural Compression

- Passive → active when agent known: "was eaten by dog" → "dog ate"
- Nominalization → verb: "made a decision" → "decided"
- Redundant pairs → single: "each and every" → "every"

## Examples

| Original | Compressed |
|----------|------------|
| The system was designed to efficiently process incoming data from multiple sources | System designed efficiently process incoming data multiple sources |
| There were at least 20 people who appeared to be waiting | At least 20 people appeared waiting |
| It is important to note that the medication should not be taken without food | Medication not taken without food |
| The researcher made a decision to investigate the anomaly that was reported | Researcher decided investigate reported anomaly |
