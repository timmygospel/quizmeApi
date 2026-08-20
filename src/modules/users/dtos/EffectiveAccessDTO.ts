export interface RoleScopeDTO {
    role: { id: string; code: string; name: string };
    organisationWide: boolean;
    allLocations: boolean;
    locations: { id: string; name: string }[];
    departments: { id: string; name: string }[];
}

export interface EffectiveAccessDTO {
    userId: string;
    roles: RoleScopeDTO[];
    permissions: string[];
}
