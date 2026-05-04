alter table projects
  add column if not exists client_question      text,
  add column if not exists design_system_comment text,
  add column if not exists estrutura_comment     text;
