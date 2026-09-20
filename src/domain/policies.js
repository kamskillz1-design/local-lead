export function canWriteRecords(profile) {
  return profile && profile.role && profile.role !== "read_only";
}

export function canManageOperationalRecords(profile) {
  return profile && ["owner", "manager"].includes(profile.role);
}

export function canManageSettings(profile) {
  return profile && ["owner", "manager"].includes(profile.role);
}

export function canManageTeam(profile) {
  return profile && ["owner", "manager"].includes(profile.role);
}

export function canChangeRoles(profile) {
  return profile && profile.role === "owner";
}
