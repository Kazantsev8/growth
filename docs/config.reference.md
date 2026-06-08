> СНИМОК для ориентира. Живой config.md — на Mail.ru WebDAV (/GrowthApp/config.md), приложение читает его оттуда. Здесь копия структуры направлений/артефактов; может слегка отставать от живого.

---
schema: growth.config
version: 1
modules:
  - id: english
    title: English
    icon: "📖"
    path: "Obsidian Vault/Personal/English"
    order: 1
    enabled: true
    artifacts:
      - id: vocabulary
        title: Vocabulary
        kind: vocabulary
        file: Vocabulary.md
      - id: tenses
        title: Tenses
        kind: doc
        file: English_tenses.md
      - id: conditionals
        title: Conditionals
        kind: doc
        file: English_conditionals.md
      - id: irregular
        title: Irregular Verbs
        kind: doc
        file: English_irregular_verbs.md
      - id: backlog
        title: Backlog
        kind: notes
        file: English_backlog.md
  - id: ios
    title: iOS
    icon: "📱"
    path: "Obsidian Vault/Professional/iOS"
    order: 2
    enabled: true
    artifacts:
      - id: roadmap
        title: Roadmap
        kind: roadmap
        file: iOS_Senior_Plus_Roadmap.md
      - id: notes
        title: Notes
        kind: doclist
        exclude: ["iOS_Senior_Plus_Roadmap.md"]
  - id: android
    title: Android
    icon: "🤖"
    path: "Obsidian Vault/Professional/Android"
    kind: checklist
    order: 3
    enabled: true
  - id: sport
    title: Sport
    icon: "🏋️"
    path: "Obsidian Vault/Personal/Sport"
    kind: weekly-habit
    order: 4
    enabled: true
    settings:
      weeklyTarget: 3
  - id: tasks
    title: Tasks
    icon: "📋"
    path: "Obsidian Vault/Tasks"
    kind: tasks
    order: 0
    enabled: true
---

# GrowthApp

Конфиг платформы Growth: реестр направлений и их артефактов.

Направление может содержать несколько артефактов (artifacts) — у каждого свой
kind и файл/папка. Если artifacts не заданы, направление = один артефакт (kind+path).

kind артефактов:
- vocabulary — словарь (Markdown-таблица word/translation/mastered/example/note/added)
- doc        — markdown-документ (рендерится как есть: заголовки, таблицы, списки)
- checklist  — список - [ ] / - [x]
- tasks      — таск-трекер (active/archived, файл на задачу, типы simple/checklist/steps)
