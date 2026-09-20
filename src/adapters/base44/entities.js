import { createEntityRepo } from "@/api/entities";

export function repo(entityName, companyId) {
  return createEntityRepo(entityName, companyId);
}

export default { repo };
