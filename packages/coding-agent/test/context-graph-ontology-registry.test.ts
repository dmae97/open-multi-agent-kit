import { describe, expect, it } from "vitest";
import {
	DEFAULT_UA_EDGE_TYPE_TO_RELATION_IRI,
	DEFAULT_UA_NODE_TYPE_TO_CLASS_IRI,
	DIRECT_NON_TRANSITIVE_UA_EDGE_TYPES,
	getOntologyClassForUaNodeType,
	getRelationForUaEdgeType,
	mapUaEdgeTypeToRelationIri,
	mapUaNodeTypeToClassIri,
	ONTOLOGY_REGISTRY,
	type OntologyRegistryCandidate,
	UA_EDGE_TYPES,
	UA_NODE_TYPES,
	validateOntologyRegistry,
} from "../src/core/context-graph-ontology-registry.ts";

describe("context graph ontology registry", () => {
	it("validates the default registry without diagnostics", () => {
		expect(validateOntologyRegistry()).toEqual([]);
		expect(getOntologyClassForUaNodeType("function").iri).toBe("omk:Function");
		expect(getRelationForUaEdgeType("calls").iri).toBe("omk:calls");
	});

	it("reports invalid registry diagnostics", () => {
		const invalidRegistry: OntologyRegistryCandidate = {
			schemaVersion: "test",
			registryVersion: "test",
			classes: [
				{
					iri: "omk:Root",
					label: "Root",
					parentIris: [],
					abstract: true,
					identityFields: ["id"],
				},
				{
					iri: "omk:BrokenParent",
					label: "Broken parent",
					parentIris: ["omk:MissingParent"],
					abstract: false,
					identityFields: ["id"],
				},
				{
					iri: "omk:CycleA",
					label: "Cycle A",
					parentIris: ["omk:CycleB"],
					abstract: false,
					identityFields: ["id"],
				},
				{
					iri: "omk:CycleB",
					label: "Cycle B",
					parentIris: ["omk:CycleA"],
					abstract: false,
					identityFields: ["id"],
				},
			],
			relations: [
				{
					iri: "omk:invalidRelation",
					domain: ["omk:MissingDomain"],
					range: ["omk:MissingRange"],
					inverse: "omk:invalidInverse",
					retrievalWeight: -0.1,
					impactWeight: 1.1,
					defaultConfidence: 2,
				},
				{
					iri: "omk:invalidInverse",
					domain: ["omk:Root"],
					range: ["omk:Root"],
					inverse: "omk:notReciprocal",
					retrievalWeight: 0.5,
					impactWeight: 0.5,
					defaultConfidence: 0.5,
				},
			],
			uaNodeTypeToClassIri: {
				file: "omk:MissingFileClass",
			},
			uaEdgeTypeToRelationIri: {
				contains: "omk:invalidRelation",
				calls: "omk:MissingCallsRelation",
			},
		};

		const codes = validateOntologyRegistry(invalidRegistry).map((diagnostic) => diagnostic.code);

		expect(codes).toContain("class.parent_missing");
		expect(codes).toContain("class.hierarchy_cycle");
		expect(codes).toContain("relation.domain_missing");
		expect(codes).toContain("relation.range_missing");
		expect(codes).toContain("relation.inverse_not_reciprocal");
		expect(codes).toContain("relation.invalid_weight");
		expect(codes).toContain("mapping.ua_node_missing");
		expect(codes).toContain("mapping.ua_node_class_missing");
		expect(codes).toContain("mapping.ua_edge_missing");
		expect(codes).toContain("mapping.ua_edge_relation_missing");
	});

	it("keeps UA mappings exhaustive and maps every UA type", () => {
		expect(Object.keys(DEFAULT_UA_NODE_TYPE_TO_CLASS_IRI).sort()).toEqual([...UA_NODE_TYPES].sort());
		expect(Object.keys(DEFAULT_UA_EDGE_TYPE_TO_RELATION_IRI).sort()).toEqual([...UA_EDGE_TYPES].sort());

		for (const nodeType of UA_NODE_TYPES) {
			const classIri = mapUaNodeTypeToClassIri(nodeType);
			expect(ONTOLOGY_REGISTRY.classes.some((definition) => definition.iri === classIri)).toBe(true);
		}
		for (const edgeType of UA_EDGE_TYPES) {
			const relationIri = mapUaEdgeTypeToRelationIri(edgeType);
			expect(ONTOLOGY_REGISTRY.relations.some((definition) => definition.iri === relationIri)).toBe(true);
		}
	});

	it("keeps direct calls, imports, and dependsOn relations non-transitive", () => {
		for (const edgeType of DIRECT_NON_TRANSITIVE_UA_EDGE_TYPES) {
			expect(getRelationForUaEdgeType(edgeType).transitive).not.toBe(true);
		}

		const invalidRegistry: OntologyRegistryCandidate = {
			...ONTOLOGY_REGISTRY,
			relations: ONTOLOGY_REGISTRY.relations.map((relation) =>
				relation.iri === "omk:calls" ? { ...relation, transitive: true } : relation,
			),
		};

		expect(validateOntologyRegistry(invalidRegistry).map((diagnostic) => diagnostic.code)).toContain(
			"relation.direct_edge_transitive",
		);
	});
});
