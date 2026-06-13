// Реестр kind → ленивый загрузчик модуля + адаптер вызова рендерера.
// Тяжёлые рендереры (tasks/sport) грузятся через import() только при открытии артефакта.
// Добавить новый kind = одна запись здесь + файл js/kinds/<kind>.js (+ опц. css/kinds/<kind>.css).
//
// ctx = { fp, host, a, m }  (fp — путь артефакта, a — артефакт, m — модуль)

export const KINDS = {
  vocabulary: { load: () => import("./vocabulary.js"), render: (mod, c) => mod.renderVocabulary(c.fp, c.host) },
  doc:        { load: () => import("./doc.js"),        render: (mod, c) => mod.renderDoc(c.fp, c.host) },
  notes:      { load: () => import("./notes.js"),      render: (mod, c) => mod.renderNotes(c.fp, c.host) },
  roadmap:    { load: () => import("./roadmap.js"),    render: (mod, c) => mod.renderRoadmap(c.fp, c.host) },
  doclist:    { load: () => import("./doclist.js"),    render: (mod, c) => mod.renderDocList(c.fp, c.host, c.a) },
  checklist:  { load: () => import("./checklist.js"),  render: (mod, c) => mod.renderChecklist({ path: c.fp, id: c.m.id }, c.host) },
  tasks:      { load: () => import("./tasks.js"),      render: (mod, c) => mod.renderTasks(c.fp, c.host) },
  sport:      { load: () => import("./sport.js"),      render: (mod, c) => mod.renderSport(c.fp, c.host) },
};

export const loadFallback = () => import("./fallback.js");
