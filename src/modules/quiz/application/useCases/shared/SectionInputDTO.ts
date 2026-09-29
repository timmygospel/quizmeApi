export interface SectionInputDTO {
    /** Existing section id, or a client-minted UUID for a new section that questions reference by `sectionId`. */
    id?: string;
    name: string;
    /** Ordered question ids in this section. When present, it's the source of truth for membership. */
    questionIds?: string[];
}
