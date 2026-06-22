export const ONTOLOGY_SCHEMA_VERSION = "0.1.0";
export const ONTOLOGY_REGISTRY_VERSION = "0.1.0";

export const UA_NODE_TYPES = [
	"file",
	"function",
	"class",
	"module",
	"concept",
	"config",
	"document",
	"service",
	"table",
	"endpoint",
	"pipeline",
	"schema",
	"resource",
	"domain",
	"flow",
	"step",
	"article",
	"entity",
	"topic",
	"claim",
	"source",
] as const;
export type UaNodeType = (typeof UA_NODE_TYPES)[number];

export const UA_EDGE_TYPES = [
	"imports",
	"exports",
	"contains",
	"inherits",
	"implements",
	"calls",
	"subscribes",
	"publishes",
	"middleware",
	"reads_from",
	"writes_to",
	"transforms",
	"validates",
	"depends_on",
	"dependsOn",
	"tested_by",
	"configures",
	"related",
	"related_to",
	"similar_to",
	"deploys",
	"serves",
	"provisions",
	"triggers",
	"migrates",
	"documents",
	"routes",
	"defines_schema",
	"contains_flow",
	"flow_step",
	"cross_domain",
	"cites",
] as const;
export type UaEdgeType = (typeof UA_EDGE_TYPES)[number];

export const DIRECT_NON_TRANSITIVE_UA_EDGE_TYPES = [
	"calls",
	"imports",
	"depends_on",
	"dependsOn",
] as const satisfies readonly UaEdgeType[];

export type OntologyClassIri = `omk:${string}`;
export type RelationIri = `omk:${string}`;

export interface OntologyClassDefinition {
	iri: OntologyClassIri;
	label: string;
	parentIris: readonly OntologyClassIri[];
	abstract: boolean;
	uaNodeTypes?: readonly UaNodeType[];
	identityFields: readonly string[];
}

export interface RelationDefinition {
	iri: RelationIri;
	uaEdgeType?: UaEdgeType;
	domain: readonly OntologyClassIri[];
	range: readonly OntologyClassIri[];
	inverse?: RelationIri;
	symmetric?: boolean;
	transitive?: boolean;
	acyclic?: boolean;
	functional?: boolean;
	retrievalWeight: number;
	impactWeight: number;
	defaultConfidence: number;
	derived?: boolean;
}

export interface OntologyRegistryCandidate {
	schemaVersion: string;
	registryVersion: string;
	classes: readonly OntologyClassDefinition[];
	relations: readonly RelationDefinition[];
	uaNodeTypeToClassIri: Readonly<Partial<Record<UaNodeType, OntologyClassIri>>>;
	uaEdgeTypeToRelationIri: Readonly<Partial<Record<UaEdgeType, RelationIri>>>;
}

export interface OntologyRegistry {
	schemaVersion: string;
	registryVersion: string;
	classes: readonly OntologyClassDefinition[];
	relations: readonly RelationDefinition[];
	uaNodeTypeToClassIri: Readonly<Record<UaNodeType, OntologyClassIri>>;
	uaEdgeTypeToRelationIri: Readonly<Record<UaEdgeType, RelationIri>>;
}

export type OntologyRegistryDiagnosticCode =
	| "class.duplicate_iri"
	| "class.parent_missing"
	| "class.hierarchy_cycle"
	| "relation.duplicate_iri"
	| "relation.domain_missing"
	| "relation.range_missing"
	| "relation.inverse_missing"
	| "relation.inverse_not_reciprocal"
	| "relation.inverse_domain_range_mismatch"
	| "relation.symmetric_inverse_invalid"
	| "relation.direct_edge_transitive"
	| "relation.invalid_weight"
	| "mapping.ua_node_missing"
	| "mapping.ua_node_class_missing"
	| "mapping.ua_edge_missing"
	| "mapping.ua_edge_relation_missing";

export interface OntologyRegistryDiagnostic {
	code: OntologyRegistryDiagnosticCode;
	message: string;
	iri?: OntologyClassIri | RelationIri;
	uaNodeType?: UaNodeType;
	uaEdgeType?: UaEdgeType;
	path?: readonly OntologyClassIri[];
}

export const ONTOLOGY_CLASSES = [
	{ iri: "omk:Thing", label: "Thing", parentIris: [], abstract: true, identityFields: ["logicalId"] },
	{
		iri: "omk:SoftwareEntity",
		label: "Software entity",
		parentIris: ["omk:Thing"],
		abstract: true,
		identityFields: ["workspaceId", "repositoryId", "logicalId"],
	},
	{
		iri: "omk:Repository",
		label: "Repository",
		parentIris: ["omk:SoftwareEntity"],
		abstract: false,
		identityFields: ["workspaceId", "repositoryId"],
	},
	{
		iri: "omk:Revision",
		label: "Revision",
		parentIris: ["omk:SoftwareEntity"],
		abstract: true,
		identityFields: ["repositoryId", "repoSha"],
	},
	{
		iri: "omk:Commit",
		label: "Commit",
		parentIris: ["omk:Revision"],
		abstract: false,
		identityFields: ["repositoryId", "repoSha"],
	},
	{
		iri: "omk:WorkingTreeSnapshot",
		label: "Working tree snapshot",
		parentIris: ["omk:Revision"],
		abstract: false,
		identityFields: ["repositoryId", "branch", "contentHash"],
	},
	{
		iri: "omk:SoftwareArtifact",
		label: "Software artifact",
		parentIris: ["omk:SoftwareEntity"],
		abstract: true,
		identityFields: ["repositoryId", "filePath"],
	},
	{
		iri: "omk:File",
		label: "File",
		parentIris: ["omk:SoftwareArtifact"],
		abstract: false,
		uaNodeTypes: ["file"],
		identityFields: ["repositoryId", "filePath"],
	},
	{
		iri: "omk:Module",
		label: "Module",
		parentIris: ["omk:SoftwareArtifact"],
		abstract: false,
		uaNodeTypes: ["module"],
		identityFields: ["repositoryId", "qualifiedName"],
	},
	{
		iri: "omk:Document",
		label: "Document",
		parentIris: ["omk:SoftwareArtifact"],
		abstract: false,
		uaNodeTypes: ["document"],
		identityFields: ["repositoryId", "filePath"],
	},
	{
		iri: "omk:Configuration",
		label: "Configuration",
		parentIris: ["omk:SoftwareArtifact"],
		abstract: false,
		uaNodeTypes: ["config"],
		identityFields: ["repositoryId", "filePath"],
	},
	{
		iri: "omk:Pipeline",
		label: "Pipeline",
		parentIris: ["omk:SoftwareArtifact"],
		abstract: false,
		uaNodeTypes: ["pipeline"],
		identityFields: ["repositoryId", "qualifiedName"],
	},
	{
		iri: "omk:InfrastructureResource",
		label: "Infrastructure resource",
		parentIris: ["omk:SoftwareArtifact"],
		abstract: false,
		uaNodeTypes: ["resource"],
		identityFields: ["repositoryId", "qualifiedName"],
	},
	{
		iri: "omk:Symbol",
		label: "Symbol",
		parentIris: ["omk:SoftwareEntity"],
		abstract: true,
		identityFields: ["repositoryId", "qualifiedName", "normalizedSignature"],
	},
	{
		iri: "omk:Callable",
		label: "Callable",
		parentIris: ["omk:Symbol"],
		abstract: true,
		identityFields: ["repositoryId", "qualifiedName", "normalizedSignature"],
	},
	{
		iri: "omk:Function",
		label: "Function",
		parentIris: ["omk:Callable"],
		abstract: false,
		uaNodeTypes: ["function"],
		identityFields: ["repositoryId", "qualifiedName", "normalizedSignature"],
	},
	{
		iri: "omk:Method",
		label: "Method",
		parentIris: ["omk:Callable"],
		abstract: false,
		identityFields: ["repositoryId", "qualifiedName", "normalizedSignature"],
	},
	{
		iri: "omk:TypeSymbol",
		label: "Type symbol",
		parentIris: ["omk:Symbol"],
		abstract: true,
		identityFields: ["repositoryId", "qualifiedName", "normalizedSignature"],
	},
	{
		iri: "omk:Class",
		label: "Class",
		parentIris: ["omk:TypeSymbol"],
		abstract: false,
		uaNodeTypes: ["class"],
		identityFields: ["repositoryId", "qualifiedName", "normalizedSignature"],
	},
	{
		iri: "omk:Interface",
		label: "Interface",
		parentIris: ["omk:TypeSymbol"],
		abstract: false,
		identityFields: ["repositoryId", "qualifiedName", "normalizedSignature"],
	},
	{
		iri: "omk:Schema",
		label: "Schema",
		parentIris: ["omk:TypeSymbol"],
		abstract: false,
		uaNodeTypes: ["schema"],
		identityFields: ["repositoryId", "qualifiedName", "normalizedSignature"],
	},
	{
		iri: "omk:Endpoint",
		label: "Endpoint",
		parentIris: ["omk:Symbol"],
		abstract: false,
		uaNodeTypes: ["endpoint"],
		identityFields: ["repositoryId", "qualifiedName", "routePattern"],
	},
	{
		iri: "omk:DataEntity",
		label: "Data entity",
		parentIris: ["omk:Symbol"],
		abstract: true,
		identityFields: ["repositoryId", "qualifiedName"],
	},
	{
		iri: "omk:Table",
		label: "Table",
		parentIris: ["omk:DataEntity"],
		abstract: false,
		uaNodeTypes: ["table"],
		identityFields: ["repositoryId", "qualifiedName"],
	},
	{
		iri: "omk:MessageSchema",
		label: "Message schema",
		parentIris: ["omk:DataEntity"],
		abstract: false,
		identityFields: ["repositoryId", "qualifiedName"],
	},
	{
		iri: "omk:Service",
		label: "Service",
		parentIris: ["omk:SoftwareEntity"],
		abstract: false,
		uaNodeTypes: ["service"],
		identityFields: ["repositoryId", "qualifiedName"],
	},
	{
		iri: "omk:SemanticEntity",
		label: "Semantic entity",
		parentIris: ["omk:Thing"],
		abstract: true,
		identityFields: ["workspaceId", "name"],
	},
	{
		iri: "omk:Concept",
		label: "Concept",
		parentIris: ["omk:SemanticEntity"],
		abstract: false,
		uaNodeTypes: ["concept"],
		identityFields: ["workspaceId", "name"],
	},
	{
		iri: "omk:Domain",
		label: "Domain",
		parentIris: ["omk:SemanticEntity"],
		abstract: false,
		uaNodeTypes: ["domain"],
		identityFields: ["workspaceId", "name"],
	},
	{
		iri: "omk:Flow",
		label: "Flow",
		parentIris: ["omk:SemanticEntity"],
		abstract: false,
		uaNodeTypes: ["flow"],
		identityFields: ["workspaceId", "qualifiedName"],
	},
	{
		iri: "omk:Step",
		label: "Step",
		parentIris: ["omk:SemanticEntity"],
		abstract: false,
		uaNodeTypes: ["step"],
		identityFields: ["workspaceId", "qualifiedName", "order"],
	},
	{
		iri: "omk:Topic",
		label: "Topic",
		parentIris: ["omk:SemanticEntity"],
		abstract: false,
		uaNodeTypes: ["topic"],
		identityFields: ["workspaceId", "name"],
	},
	{
		iri: "omk:Claim",
		label: "Claim",
		parentIris: ["omk:SemanticEntity"],
		abstract: false,
		uaNodeTypes: ["claim"],
		identityFields: ["workspaceId", "contentHash"],
	},
	{
		iri: "omk:ExternalEntity",
		label: "External entity",
		parentIris: ["omk:SemanticEntity"],
		abstract: false,
		uaNodeTypes: ["entity"],
		identityFields: ["workspaceId", "name", "source"],
	},
	{
		iri: "omk:Article",
		label: "Article",
		parentIris: ["omk:Document"],
		abstract: false,
		uaNodeTypes: ["article"],
		identityFields: ["workspaceId", "source", "title"],
	},
	{
		iri: "omk:OperationalEntity",
		label: "Operational entity",
		parentIris: ["omk:Thing"],
		abstract: true,
		identityFields: ["workspaceId", "episodeId"],
	},
	{
		iri: "omk:Episode",
		label: "Episode",
		parentIris: ["omk:OperationalEntity"],
		abstract: false,
		identityFields: ["workspaceId", "episodeId"],
	},
	{
		iri: "omk:Session",
		label: "Session",
		parentIris: ["omk:OperationalEntity"],
		abstract: false,
		identityFields: ["workspaceId", "sessionId"],
	},
	{
		iri: "omk:Turn",
		label: "Turn",
		parentIris: ["omk:OperationalEntity"],
		abstract: false,
		identityFields: ["workspaceId", "sessionId", "turnId"],
	},
	{
		iri: "omk:ToolCall",
		label: "Tool call",
		parentIris: ["omk:OperationalEntity"],
		abstract: false,
		identityFields: ["workspaceId", "sessionId", "toolCallId"],
	},
	{
		iri: "omk:CommandRun",
		label: "Command run",
		parentIris: ["omk:OperationalEntity"],
		abstract: false,
		identityFields: ["workspaceId", "commandHash", "startedAt"],
	},
	{
		iri: "omk:TestRun",
		label: "Test run",
		parentIris: ["omk:OperationalEntity"],
		abstract: false,
		identityFields: ["workspaceId", "commandHash", "startedAt"],
	},
	{
		iri: "omk:BuildRun",
		label: "Build run",
		parentIris: ["omk:OperationalEntity"],
		abstract: false,
		identityFields: ["workspaceId", "commandHash", "startedAt"],
	},
	{
		iri: "omk:Error",
		label: "Error",
		parentIris: ["omk:OperationalEntity"],
		abstract: false,
		identityFields: ["workspaceId", "errorHash"],
	},
	{
		iri: "omk:GeneratedArtifact",
		label: "Generated artifact",
		parentIris: ["omk:OperationalEntity"],
		abstract: false,
		identityFields: ["workspaceId", "filePath", "contentHash"],
	},
	{
		iri: "omk:GovernanceEntity",
		label: "Governance entity",
		parentIris: ["omk:Thing"],
		abstract: true,
		identityFields: ["workspaceId", "logicalId"],
	},
	{
		iri: "omk:Requirement",
		label: "Requirement",
		parentIris: ["omk:GovernanceEntity"],
		abstract: false,
		identityFields: ["workspaceId", "requirementId"],
	},
	{
		iri: "omk:Constraint",
		label: "Constraint",
		parentIris: ["omk:GovernanceEntity"],
		abstract: false,
		identityFields: ["workspaceId", "constraintHash"],
	},
	{
		iri: "omk:Decision",
		label: "Decision",
		parentIris: ["omk:GovernanceEntity"],
		abstract: false,
		identityFields: ["workspaceId", "decisionHash"],
	},
	{
		iri: "omk:Evidence",
		label: "Evidence",
		parentIris: ["omk:GovernanceEntity"],
		abstract: false,
		identityFields: ["workspaceId", "evidenceHash"],
	},
	{
		iri: "omk:Source",
		label: "Source",
		parentIris: ["omk:GovernanceEntity"],
		abstract: false,
		uaNodeTypes: ["source"],
		identityFields: ["workspaceId", "sourceUri", "contentHash"],
	},
	{
		iri: "omk:Assumption",
		label: "Assumption",
		parentIris: ["omk:GovernanceEntity"],
		abstract: false,
		identityFields: ["workspaceId", "assumptionHash"],
	},
] as const satisfies readonly OntologyClassDefinition[];

const THING_DOMAIN = ["omk:Thing"] as const satisfies readonly OntologyClassIri[];
const THING_RANGE = ["omk:Thing"] as const satisfies readonly OntologyClassIri[];

export const ONTOLOGY_RELATIONS = [
	{
		iri: "omk:contains",
		uaEdgeType: "contains",
		domain: THING_DOMAIN,
		range: THING_RANGE,
		acyclic: true,
		retrievalWeight: 1,
		impactWeight: 0.75,
		defaultConfidence: 0.95,
	},
	{
		iri: "omk:imports",
		uaEdgeType: "imports",
		domain: THING_DOMAIN,
		range: THING_RANGE,
		transitive: false,
		retrievalWeight: 0.7,
		impactWeight: 0.8,
		defaultConfidence: 0.9,
	},
	{
		iri: "omk:exports",
		uaEdgeType: "exports",
		domain: THING_DOMAIN,
		range: THING_RANGE,
		retrievalWeight: 0.8,
		impactWeight: 0.75,
		defaultConfidence: 0.88,
	},
	{
		iri: "omk:inherits",
		uaEdgeType: "inherits",
		domain: ["omk:Class"],
		range: ["omk:Class"],
		acyclic: true,
		retrievalWeight: 0.9,
		impactWeight: 0.9,
		defaultConfidence: 0.9,
	},
	{
		iri: "omk:implements",
		uaEdgeType: "implements",
		domain: ["omk:Class"],
		range: ["omk:Class", "omk:Interface", "omk:Concept"],
		acyclic: true,
		retrievalWeight: 0.9,
		impactWeight: 0.85,
		defaultConfidence: 0.9,
	},
	{
		iri: "omk:calls",
		uaEdgeType: "calls",
		domain: ["omk:Callable", "omk:Endpoint"],
		range: ["omk:Callable", "omk:Endpoint"],
		transitive: false,
		retrievalWeight: 0.8,
		impactWeight: 0.9,
		defaultConfidence: 0.88,
	},
	{
		iri: "omk:subscribes",
		uaEdgeType: "subscribes",
		domain: THING_DOMAIN,
		range: ["omk:Topic", "omk:Endpoint"],
		retrievalWeight: 0.6,
		impactWeight: 0.55,
		defaultConfidence: 0.78,
	},
	{
		iri: "omk:publishes",
		uaEdgeType: "publishes",
		domain: THING_DOMAIN,
		range: ["omk:Topic", "omk:Endpoint"],
		retrievalWeight: 0.6,
		impactWeight: 0.55,
		defaultConfidence: 0.78,
	},
	{
		iri: "omk:middleware",
		uaEdgeType: "middleware",
		domain: ["omk:Endpoint", "omk:Service", "omk:File"],
		range: THING_RANGE,
		retrievalWeight: 0.55,
		impactWeight: 0.6,
		defaultConfidence: 0.78,
	},
	{
		iri: "omk:readsFrom",
		uaEdgeType: "reads_from",
		domain: THING_DOMAIN,
		range: ["omk:DataEntity", "omk:Schema", "omk:File", "omk:ExternalEntity"],
		retrievalWeight: 0.65,
		impactWeight: 0.65,
		defaultConfidence: 0.82,
	},
	{
		iri: "omk:writesTo",
		uaEdgeType: "writes_to",
		domain: THING_DOMAIN,
		range: ["omk:DataEntity", "omk:Schema", "omk:File", "omk:ExternalEntity"],
		retrievalWeight: 0.65,
		impactWeight: 0.8,
		defaultConfidence: 0.82,
	},
	{
		iri: "omk:transforms",
		uaEdgeType: "transforms",
		domain: THING_DOMAIN,
		range: THING_RANGE,
		retrievalWeight: 0.55,
		impactWeight: 0.65,
		defaultConfidence: 0.76,
	},
	{
		iri: "omk:validates",
		uaEdgeType: "validates",
		domain: THING_DOMAIN,
		range: THING_RANGE,
		retrievalWeight: 0.55,
		impactWeight: 0.55,
		defaultConfidence: 0.8,
	},
	{
		iri: "omk:dependsOn",
		uaEdgeType: "depends_on",
		domain: THING_DOMAIN,
		range: THING_RANGE,
		transitive: false,
		retrievalWeight: 0.6,
		impactWeight: 0.85,
		defaultConfidence: 0.86,
	},
	{
		iri: "omk:testedBy",
		uaEdgeType: "tested_by",
		domain: THING_DOMAIN,
		range: ["omk:File", "omk:TestRun", "omk:GeneratedArtifact"],
		retrievalWeight: 0.5,
		impactWeight: 0.95,
		defaultConfidence: 0.9,
	},
	{
		iri: "omk:configures",
		uaEdgeType: "configures",
		domain: ["omk:Configuration", "omk:Decision", "omk:File"],
		range: THING_RANGE,
		retrievalWeight: 0.6,
		impactWeight: 0.6,
		defaultConfidence: 0.82,
	},
	{
		iri: "omk:related",
		uaEdgeType: "related",
		domain: THING_DOMAIN,
		range: THING_RANGE,
		symmetric: true,
		retrievalWeight: 0.5,
		impactWeight: 0.2,
		defaultConfidence: 0.6,
	},
	{
		iri: "omk:similarTo",
		uaEdgeType: "similar_to",
		domain: THING_DOMAIN,
		range: THING_RANGE,
		symmetric: true,
		retrievalWeight: 0.45,
		impactWeight: 0.1,
		defaultConfidence: 0.58,
	},
	{
		iri: "omk:deploys",
		uaEdgeType: "deploys",
		domain: ["omk:Pipeline", "omk:Service"],
		range: ["omk:Service", "omk:InfrastructureResource"],
		retrievalWeight: 0.7,
		impactWeight: 0.7,
		defaultConfidence: 0.82,
	},
	{
		iri: "omk:serves",
		uaEdgeType: "serves",
		domain: ["omk:Service", "omk:Endpoint"],
		range: ["omk:Endpoint", "omk:Service"],
		retrievalWeight: 0.6,
		impactWeight: 0.6,
		defaultConfidence: 0.82,
	},
	{
		iri: "omk:provisions",
		uaEdgeType: "provisions",
		domain: ["omk:Pipeline", "omk:InfrastructureResource"],
		range: ["omk:InfrastructureResource", "omk:Service"],
		retrievalWeight: 0.6,
		impactWeight: 0.6,
		defaultConfidence: 0.8,
	},
	{
		iri: "omk:triggers",
		uaEdgeType: "triggers",
		domain: THING_DOMAIN,
		range: ["omk:Pipeline", "omk:CommandRun", "omk:BuildRun", "omk:TestRun", "omk:ToolCall"],
		retrievalWeight: 0.6,
		impactWeight: 0.6,
		defaultConfidence: 0.8,
	},
	{
		iri: "omk:migrates",
		uaEdgeType: "migrates",
		domain: ["omk:Pipeline", "omk:File", "omk:Schema"],
		range: ["omk:Table", "omk:Schema", "omk:DataEntity"],
		retrievalWeight: 0.7,
		impactWeight: 0.7,
		defaultConfidence: 0.82,
	},
	{
		iri: "omk:documents",
		uaEdgeType: "documents",
		domain: ["omk:Document", "omk:Source", "omk:Article"],
		range: THING_RANGE,
		retrievalWeight: 0.5,
		impactWeight: 0.2,
		defaultConfidence: 0.78,
	},
	{
		iri: "omk:routes",
		uaEdgeType: "routes",
		domain: ["omk:Endpoint", "omk:Service", "omk:File"],
		range: ["omk:Callable", "omk:Endpoint", "omk:Service"],
		retrievalWeight: 0.7,
		impactWeight: 0.75,
		defaultConfidence: 0.84,
	},
	{
		iri: "omk:definesSchema",
		uaEdgeType: "defines_schema",
		domain: ["omk:Schema", "omk:File"],
		range: ["omk:Schema", "omk:Table", "omk:Endpoint", "omk:DataEntity"],
		retrievalWeight: 0.8,
		impactWeight: 0.7,
		defaultConfidence: 0.84,
	},
	{
		iri: "omk:containsFlow",
		uaEdgeType: "contains_flow",
		domain: ["omk:Domain"],
		range: ["omk:Flow"],
		acyclic: true,
		retrievalWeight: 0.55,
		impactWeight: 0.3,
		defaultConfidence: 0.76,
	},
	{
		iri: "omk:flowStep",
		uaEdgeType: "flow_step",
		domain: ["omk:Flow"],
		range: ["omk:Step"],
		acyclic: true,
		retrievalWeight: 0.55,
		impactWeight: 0.3,
		defaultConfidence: 0.76,
	},
	{
		iri: "omk:crossDomain",
		uaEdgeType: "cross_domain",
		domain: ["omk:Domain"],
		range: ["omk:Domain"],
		symmetric: true,
		retrievalWeight: 0.45,
		impactWeight: 0.25,
		defaultConfidence: 0.7,
	},
	{
		iri: "omk:cites",
		uaEdgeType: "cites",
		domain: ["omk:Article", "omk:Claim", "omk:Document"],
		range: ["omk:Source", "omk:Article", "omk:Document"],
		retrievalWeight: 0.5,
		impactWeight: 0.2,
		defaultConfidence: 0.76,
	},
	{
		iri: "omk:sameAs",
		domain: THING_DOMAIN,
		range: THING_RANGE,
		symmetric: true,
		transitive: true,
		retrievalWeight: 0.8,
		impactWeight: 0.45,
		defaultConfidence: 0.95,
		derived: true,
	},
	{
		iri: "omk:possibleSameAs",
		domain: THING_DOMAIN,
		range: THING_RANGE,
		symmetric: true,
		retrievalWeight: 0.35,
		impactWeight: 0.1,
		defaultConfidence: 0.6,
		derived: true,
	},
	{
		iri: "omk:renamedTo",
		domain: ["omk:SoftwareEntity"],
		range: ["omk:SoftwareEntity"],
		acyclic: true,
		retrievalWeight: 0.65,
		impactWeight: 0.4,
		defaultConfidence: 0.9,
		derived: true,
	},
	{
		iri: "omk:supersededBy",
		domain: THING_DOMAIN,
		range: THING_RANGE,
		functional: true,
		acyclic: true,
		retrievalWeight: 0.4,
		impactWeight: 0.2,
		defaultConfidence: 0.9,
		derived: true,
	},
	{
		iri: "omk:hasEvidence",
		domain: THING_DOMAIN,
		range: ["omk:Evidence", "omk:Source", "omk:Episode"],
		retrievalWeight: 0.65,
		impactWeight: 0.2,
		defaultConfidence: 0.85,
		derived: true,
	},
	{
		iri: "omk:inferredFrom",
		domain: THING_DOMAIN,
		range: THING_RANGE,
		acyclic: true,
		retrievalWeight: 0.55,
		impactWeight: 0.2,
		defaultConfidence: 0.8,
		derived: true,
	},
] as const satisfies readonly RelationDefinition[];

export const DEFAULT_UA_NODE_TYPE_TO_CLASS_IRI = {
	article: "omk:Article",
	class: "omk:Class",
	concept: "omk:Concept",
	config: "omk:Configuration",
	document: "omk:Document",
	endpoint: "omk:Endpoint",
	entity: "omk:ExternalEntity",
	file: "omk:File",
	flow: "omk:Flow",
	function: "omk:Function",
	domain: "omk:Domain",
	module: "omk:Module",
	pipeline: "omk:Pipeline",
	resource: "omk:InfrastructureResource",
	schema: "omk:Schema",
	service: "omk:Service",
	source: "omk:Source",
	step: "omk:Step",
	table: "omk:Table",
	topic: "omk:Topic",
	claim: "omk:Claim",
} as const satisfies Readonly<Record<UaNodeType, OntologyClassIri>>;

export const DEFAULT_UA_EDGE_TYPE_TO_RELATION_IRI = {
	calls: "omk:calls",
	cites: "omk:cites",
	configures: "omk:configures",
	contains: "omk:contains",
	contains_flow: "omk:containsFlow",
	cross_domain: "omk:crossDomain",
	defines_schema: "omk:definesSchema",
	depends_on: "omk:dependsOn",
	dependsOn: "omk:dependsOn",
	deploys: "omk:deploys",
	documents: "omk:documents",
	exports: "omk:exports",
	flow_step: "omk:flowStep",
	implements: "omk:implements",
	imports: "omk:imports",
	inherits: "omk:inherits",
	middleware: "omk:middleware",
	migrates: "omk:migrates",
	provisions: "omk:provisions",
	publishes: "omk:publishes",
	reads_from: "omk:readsFrom",
	related: "omk:related",
	related_to: "omk:related",
	routes: "omk:routes",
	serves: "omk:serves",
	similar_to: "omk:similarTo",
	subscribes: "omk:subscribes",
	tested_by: "omk:testedBy",
	transforms: "omk:transforms",
	triggers: "omk:triggers",
	validates: "omk:validates",
	writes_to: "omk:writesTo",
} as const satisfies Readonly<Record<UaEdgeType, RelationIri>>;

export const ONTOLOGY_REGISTRY: OntologyRegistry = {
	schemaVersion: ONTOLOGY_SCHEMA_VERSION,
	registryVersion: ONTOLOGY_REGISTRY_VERSION,
	classes: ONTOLOGY_CLASSES,
	relations: ONTOLOGY_RELATIONS,
	uaNodeTypeToClassIri: DEFAULT_UA_NODE_TYPE_TO_CLASS_IRI,
	uaEdgeTypeToRelationIri: DEFAULT_UA_EDGE_TYPE_TO_RELATION_IRI,
};

export function validateOntologyRegistry(
	registry: OntologyRegistryCandidate = ONTOLOGY_REGISTRY,
): OntologyRegistryDiagnostic[] {
	const diagnostics: OntologyRegistryDiagnostic[] = [];
	const classMap = createOntologyClassMap(registry.classes);
	const relationMap = createRelationMap(registry.relations);

	pushDuplicateClassDiagnostics(registry.classes, diagnostics);
	pushDuplicateRelationDiagnostics(registry.relations, diagnostics);
	pushParentDiagnostics(registry.classes, classMap, diagnostics);
	pushClassHierarchyCycleDiagnostics(registry.classes, classMap, diagnostics);
	pushRelationDiagnostics(registry.relations, classMap, relationMap, diagnostics);
	pushMappingDiagnostics(registry, classMap, relationMap, diagnostics);

	return diagnostics;
}

export function createOntologyClassMap(
	classes: readonly OntologyClassDefinition[] = ONTOLOGY_CLASSES,
): ReadonlyMap<OntologyClassIri, OntologyClassDefinition> {
	return new Map(classes.map((definition) => [definition.iri, definition]));
}

export function createRelationMap(
	relations: readonly RelationDefinition[] = ONTOLOGY_RELATIONS,
): ReadonlyMap<RelationIri, RelationDefinition> {
	return new Map(relations.map((definition) => [definition.iri, definition]));
}

export function mapUaNodeTypeToClassIri(
	nodeType: UaNodeType,
	registry: OntologyRegistryCandidate = ONTOLOGY_REGISTRY,
): OntologyClassIri {
	const classIri = registry.uaNodeTypeToClassIri[nodeType];
	if (classIri === undefined) {
		throw new Error(`No ontology class mapping exists for UA node type '${nodeType}'`);
	}
	return classIri;
}

export function mapUaEdgeTypeToRelationIri(
	edgeType: UaEdgeType,
	registry: OntologyRegistryCandidate = ONTOLOGY_REGISTRY,
): RelationIri {
	const relationIri = registry.uaEdgeTypeToRelationIri[edgeType];
	if (relationIri === undefined) {
		throw new Error(`No ontology relation mapping exists for UA edge type '${edgeType}'`);
	}
	return relationIri;
}

export function getOntologyClassDefinition(
	classIri: OntologyClassIri,
	registry: OntologyRegistryCandidate = ONTOLOGY_REGISTRY,
): OntologyClassDefinition | undefined {
	return createOntologyClassMap(registry.classes).get(classIri);
}

export function getRelationDefinition(
	relationIri: RelationIri,
	registry: OntologyRegistryCandidate = ONTOLOGY_REGISTRY,
): RelationDefinition | undefined {
	return createRelationMap(registry.relations).get(relationIri);
}

export function getOntologyClassForUaNodeType(
	nodeType: UaNodeType,
	registry: OntologyRegistryCandidate = ONTOLOGY_REGISTRY,
): OntologyClassDefinition {
	const classIri = mapUaNodeTypeToClassIri(nodeType, registry);
	const definition = getOntologyClassDefinition(classIri, registry);
	if (definition === undefined) {
		throw new Error(`Ontology class '${classIri}' mapped from UA node type '${nodeType}' is not defined`);
	}
	return definition;
}

export function getRelationForUaEdgeType(
	edgeType: UaEdgeType,
	registry: OntologyRegistryCandidate = ONTOLOGY_REGISTRY,
): RelationDefinition {
	const relationIri = mapUaEdgeTypeToRelationIri(edgeType, registry);
	const definition = getRelationDefinition(relationIri, registry);
	if (definition === undefined) {
		throw new Error(`Ontology relation '${relationIri}' mapped from UA edge type '${edgeType}' is not defined`);
	}
	return definition;
}

function pushDuplicateClassDiagnostics(
	classes: readonly OntologyClassDefinition[],
	diagnostics: OntologyRegistryDiagnostic[],
): void {
	const seen = new Set<OntologyClassIri>();
	for (const definition of classes) {
		if (seen.has(definition.iri)) {
			diagnostics.push({
				code: "class.duplicate_iri",
				message: `Duplicate ontology class '${definition.iri}'`,
				iri: definition.iri,
			});
		}
		seen.add(definition.iri);
	}
}

function pushDuplicateRelationDiagnostics(
	relations: readonly RelationDefinition[],
	diagnostics: OntologyRegistryDiagnostic[],
): void {
	const seen = new Set<RelationIri>();
	for (const definition of relations) {
		if (seen.has(definition.iri)) {
			diagnostics.push({
				code: "relation.duplicate_iri",
				message: `Duplicate ontology relation '${definition.iri}'`,
				iri: definition.iri,
			});
		}
		seen.add(definition.iri);
	}
}

function pushParentDiagnostics(
	classes: readonly OntologyClassDefinition[],
	classMap: ReadonlyMap<OntologyClassIri, OntologyClassDefinition>,
	diagnostics: OntologyRegistryDiagnostic[],
): void {
	for (const definition of classes) {
		for (const parentIri of definition.parentIris) {
			if (!classMap.has(parentIri)) {
				diagnostics.push({
					code: "class.parent_missing",
					message: `Ontology class '${definition.iri}' references missing parent '${parentIri}'`,
					iri: definition.iri,
				});
			}
		}
	}
}

function pushClassHierarchyCycleDiagnostics(
	classes: readonly OntologyClassDefinition[],
	classMap: ReadonlyMap<OntologyClassIri, OntologyClassDefinition>,
	diagnostics: OntologyRegistryDiagnostic[],
): void {
	const visited = new Set<OntologyClassIri>();
	const visiting = new Set<OntologyClassIri>();
	const reported = new Set<string>();

	for (const definition of classes) {
		visitClassHierarchy(definition.iri, [], classMap, visited, visiting, reported, diagnostics);
	}
}

function visitClassHierarchy(
	classIri: OntologyClassIri,
	path: readonly OntologyClassIri[],
	classMap: ReadonlyMap<OntologyClassIri, OntologyClassDefinition>,
	visited: Set<OntologyClassIri>,
	visiting: Set<OntologyClassIri>,
	reported: Set<string>,
	diagnostics: OntologyRegistryDiagnostic[],
): void {
	if (visited.has(classIri)) return;
	const existingPathIndex = path.indexOf(classIri);
	if (visiting.has(classIri) || existingPathIndex >= 0) {
		const cyclePath = [...path.slice(Math.max(existingPathIndex, 0)), classIri];
		const key = [...cyclePath].sort().join("|");
		if (!reported.has(key)) {
			reported.add(key);
			diagnostics.push({
				code: "class.hierarchy_cycle",
				message: `Ontology class hierarchy contains a cycle: ${cyclePath.join(" -> ")}`,
				iri: classIri,
				path: cyclePath,
			});
		}
		return;
	}

	const definition = classMap.get(classIri);
	if (definition === undefined) return;

	visiting.add(classIri);
	for (const parentIri of definition.parentIris) {
		if (classMap.has(parentIri)) {
			visitClassHierarchy(parentIri, [...path, classIri], classMap, visited, visiting, reported, diagnostics);
		}
	}
	visiting.delete(classIri);
	visited.add(classIri);
}

function pushRelationDiagnostics(
	relations: readonly RelationDefinition[],
	classMap: ReadonlyMap<OntologyClassIri, OntologyClassDefinition>,
	relationMap: ReadonlyMap<RelationIri, RelationDefinition>,
	diagnostics: OntologyRegistryDiagnostic[],
): void {
	for (const relation of relations) {
		pushRelationClassExistenceDiagnostics(relation, classMap, diagnostics);
		pushRelationInverseDiagnostics(relation, relationMap, diagnostics);
		pushDirectRelationDiagnostics(relation, diagnostics);
		pushRelationWeightDiagnostics(relation, diagnostics);
	}
}

function pushRelationClassExistenceDiagnostics(
	relation: RelationDefinition,
	classMap: ReadonlyMap<OntologyClassIri, OntologyClassDefinition>,
	diagnostics: OntologyRegistryDiagnostic[],
): void {
	for (const classIri of relation.domain) {
		if (!classMap.has(classIri)) {
			diagnostics.push({
				code: "relation.domain_missing",
				message: `Relation '${relation.iri}' references missing domain class '${classIri}'`,
				iri: relation.iri,
			});
		}
	}
	for (const classIri of relation.range) {
		if (!classMap.has(classIri)) {
			diagnostics.push({
				code: "relation.range_missing",
				message: `Relation '${relation.iri}' references missing range class '${classIri}'`,
				iri: relation.iri,
			});
		}
	}
}

function pushRelationInverseDiagnostics(
	relation: RelationDefinition,
	relationMap: ReadonlyMap<RelationIri, RelationDefinition>,
	diagnostics: OntologyRegistryDiagnostic[],
): void {
	if (relation.symmetric === true && relation.inverse !== undefined && relation.inverse !== relation.iri) {
		diagnostics.push({
			code: "relation.symmetric_inverse_invalid",
			message: `Symmetric relation '${relation.iri}' must omit inverse or point to itself`,
			iri: relation.iri,
		});
	}

	if (relation.inverse === undefined) return;

	const inverse = relationMap.get(relation.inverse);
	if (inverse === undefined) {
		diagnostics.push({
			code: "relation.inverse_missing",
			message: `Relation '${relation.iri}' references missing inverse '${relation.inverse}'`,
			iri: relation.iri,
		});
		return;
	}

	if (inverse.inverse !== relation.iri) {
		diagnostics.push({
			code: "relation.inverse_not_reciprocal",
			message: `Relation '${relation.iri}' inverse '${inverse.iri}' does not point back to '${relation.iri}'`,
			iri: relation.iri,
		});
	}

	if (!sameIriSet(relation.domain, inverse.range) || !sameIriSet(relation.range, inverse.domain)) {
		diagnostics.push({
			code: "relation.inverse_domain_range_mismatch",
			message: `Relation '${relation.iri}' inverse '${inverse.iri}' has incompatible domain/range`,
			iri: relation.iri,
		});
	}
}

function pushDirectRelationDiagnostics(relation: RelationDefinition, diagnostics: OntologyRegistryDiagnostic[]): void {
	if (relation.uaEdgeType === undefined) return;
	if (!isDirectNonTransitiveUaEdgeType(relation.uaEdgeType)) return;
	if (relation.transitive !== true) return;

	diagnostics.push({
		code: "relation.direct_edge_transitive",
		message: `Direct UA relation '${relation.uaEdgeType}' must not be marked transitive`,
		iri: relation.iri,
		uaEdgeType: relation.uaEdgeType,
	});
}

function pushRelationWeightDiagnostics(relation: RelationDefinition, diagnostics: OntologyRegistryDiagnostic[]): void {
	const weightedFields = [
		["retrievalWeight", relation.retrievalWeight],
		["impactWeight", relation.impactWeight],
		["defaultConfidence", relation.defaultConfidence],
	] as const;

	for (const [fieldName, value] of weightedFields) {
		if (!isUnitInterval(value)) {
			diagnostics.push({
				code: "relation.invalid_weight",
				message: `Relation '${relation.iri}' field '${fieldName}' must be in [0,1]`,
				iri: relation.iri,
			});
		}
	}
}

function pushMappingDiagnostics(
	registry: OntologyRegistryCandidate,
	classMap: ReadonlyMap<OntologyClassIri, OntologyClassDefinition>,
	relationMap: ReadonlyMap<RelationIri, RelationDefinition>,
	diagnostics: OntologyRegistryDiagnostic[],
): void {
	for (const nodeType of UA_NODE_TYPES) {
		const classIri = registry.uaNodeTypeToClassIri[nodeType];
		if (classIri === undefined) {
			diagnostics.push({
				code: "mapping.ua_node_missing",
				message: `Missing ontology class mapping for UA node type '${nodeType}'`,
				uaNodeType: nodeType,
			});
			continue;
		}
		if (!classMap.has(classIri)) {
			diagnostics.push({
				code: "mapping.ua_node_class_missing",
				message: `UA node type '${nodeType}' maps to missing ontology class '${classIri}'`,
				iri: classIri,
				uaNodeType: nodeType,
			});
		}
	}

	for (const edgeType of UA_EDGE_TYPES) {
		const relationIri = registry.uaEdgeTypeToRelationIri[edgeType];
		if (relationIri === undefined) {
			diagnostics.push({
				code: "mapping.ua_edge_missing",
				message: `Missing ontology relation mapping for UA edge type '${edgeType}'`,
				uaEdgeType: edgeType,
			});
			continue;
		}
		if (!relationMap.has(relationIri)) {
			diagnostics.push({
				code: "mapping.ua_edge_relation_missing",
				message: `UA edge type '${edgeType}' maps to missing ontology relation '${relationIri}'`,
				iri: relationIri,
				uaEdgeType: edgeType,
			});
		}
	}
}

function isDirectNonTransitiveUaEdgeType(edgeType: UaEdgeType): boolean {
	return DIRECT_NON_TRANSITIVE_UA_EDGE_TYPES.some((directEdgeType) => directEdgeType === edgeType);
}

function isUnitInterval(value: number): boolean {
	return Number.isFinite(value) && value >= 0 && value <= 1;
}

function sameIriSet(left: readonly OntologyClassIri[], right: readonly OntologyClassIri[]): boolean {
	if (left.length !== right.length) return false;
	const rightSet = new Set(right);
	return left.every((iri) => rightSet.has(iri));
}
