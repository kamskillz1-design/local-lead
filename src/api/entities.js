import { supabase } from "@/api/supabaseClient";

export const ENTITY_TABLES = {
  Activity: "activities",
  Appointment: "appointments",
  AuditLog: "audit_logs",
  Company: "companies",
  Contact: "contacts",
  Deal: "deals",
  EmailTemplate: "email_templates",
  FollowUpTask: "follow_up_tasks",
  Form: "forms",
  FormSubmission: "form_submissions",
  Lead: "leads",
  LeadSource: "lead_sources",
  Message: "messages",
  Notification: "notifications",
  Organisation: "organisations",
  Pipeline: "pipelines",
  PipelineStage: "pipeline_stages",
  PrivacyRequest: "privacy_requests",
  Tag: "tags",
  UserProfile: "user_profiles",
};

const SORT_COLUMNS = {
  created_date: "created_at",
  updated_date: "updated_at",
};

function tableFor(entityName) {
  const table = ENTITY_TABLES[entityName];
  if (!table) throw new Error(`Unknown entity: ${entityName}`);
  return table;
}

function mapRow(row) {
  if (!row) return row;
  return {
    ...row,
    created_date: row.created_at,
    updated_date: row.updated_at,
  };
}

function mapPayload(entityName, payload) {
  if (!payload || typeof payload !== "object") return payload;
  const next = { ...payload };
  if ("created_date" in next) {
    next.created_at = next.created_date;
    delete next.created_date;
  }
  if ("updated_date" in next) {
    next.updated_at = next.updated_date;
    delete next.updated_date;
  }
  if (entityName === "AuditLog") {
    if ("before" in next) {
      next.before_data_summary = next.before;
      delete next.before;
    }
    if ("after" in next) {
      next.after_data_summary = next.after;
      delete next.after;
    }
  }
  return next;
}

function applySort(query, sort) {
  if (!sort) return query.order("created_at", { ascending: false });
  const desc = String(sort).startsWith("-");
  const raw = desc ? String(sort).slice(1) : String(sort);
  const col = SORT_COLUMNS[raw] || raw;
  return query.order(col, { ascending: !desc });
}

function applyFilters(query, filters) {
  if (!filters || typeof filters !== "object") return query;
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined) return;
    const col = SORT_COLUMNS[key] || key;
    if (Array.isArray(value)) {
      query = query.in(col, value);
    } else if (value === null) {
      query = query.is(col, null);
    } else {
      query = query.eq(col, value);
    }
  });
  return query;
}

export function createEntityRepo(entityName, companyId) {
  const table = tableFor(entityName);

  const scoped = (q) => {
    if (companyId && entityName !== "Company") {
      return q.eq("company_id", companyId);
    }
    if (companyId && entityName === "Company") {
      return q.eq("company_id", companyId);
    }
    return q;
  };

  return {
    async filter(filters = {}, sort, limit) {
      let q = scoped(supabase.from(table).select("*"));
      q = applyFilters(q, filters);
      q = applySort(q, sort);
      if (limit) q = q.limit(Number(limit));
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(mapRow);
    },

    async list(sort, limit) {
      return this.filter({}, sort, limit);
    },

    async get(id) {
      let q = scoped(supabase.from(table).select("*").eq("id", id)).maybeSingle();
      const { data, error } = await q;
      if (error) throw error;
      return mapRow(data);
    },

    async create(payload) {
      const body = mapPayload(entityName, { ...payload });
      if (companyId && !body.company_id) body.company_id = companyId;
      const { data, error } = await supabase.from(table).insert(body).select("*").single();
      if (error) throw error;
      return mapRow(data);
    },

    async update(id, payload) {
      const body = mapPayload(entityName, { ...payload });
      delete body.id;
      const { data, error } = await scoped(supabase.from(table).update(body).eq("id", id))
        .select("*")
        .single();
      if (error) throw error;
      return mapRow(data);
    },

    async delete(id) {
      const { error } = await scoped(supabase.from(table).delete().eq("id", id));
      if (error) throw error;
      return { id };
    },

    async bulkUpdate(rows) {
      const results = [];
      for (const row of rows || []) {
        if (!row?.id) continue;
        const { id, ...rest } = row;
        results.push(await this.update(id, rest));
      }
      return results;
    },

    async bulkCreate(rows) {
      const results = [];
      for (const row of rows || []) {
        results.push(await this.create(row));
      }
      return results;
    },

    subscribe(callback) {
      const channel = supabase
        .channel(`${table}-${companyId || "all"}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            ...(companyId ? { filter: `company_id=eq.${companyId}` } : {}),
          },
          (payload) => {
            callback({
              type: payload.eventType,
              data: mapRow(payload.new && Object.keys(payload.new).length ? payload.new : payload.old),
              new: mapRow(payload.new),
              old: mapRow(payload.old),
            });
          }
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    },
  };
}
