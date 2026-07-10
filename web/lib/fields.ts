// The field list is dynamic: extraction decides which fields the specific
// contract needs, so this type is the only thing shared between UI and API.
export type ContractField = {
  key: string;
  label: string;
  group: string;
  value: string; // "" when not found in the correspondence
  multiline: boolean;
  optional: boolean; // true when the field may legitimately not apply to this deal
};
