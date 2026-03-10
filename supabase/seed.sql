-- ===========================================
-- Seed data for EdTech Library demo
-- Run this AFTER schema.sql
-- ===========================================

-- Create a demo district (this triggers the default rubric creation)
insert into districts (id, name, slug)
values ('d0000000-0000-0000-0000-000000000001', 'Springfield USD', 'springfield');

-- Create categories
insert into categories (id, district_id, name, description, sort_order) values
('c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Learning Management', 'Platforms for organizing courses, assignments, and grades', 0),
('c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Assessment', 'Tools for quizzes, tests, and formative assessment', 1),
('c0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'Communication', 'Platforms for parent, student, and staff communication', 2),
('c0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'Content Creation', 'Tools for creating presentations, videos, and visual projects', 3),
('c0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001', 'Accessibility', 'Assistive technology and accessibility tools', 4);

-- Create approved tools
insert into tools (district_id, name, vendor, description, url, category_id, grade_levels, subject_areas, dpa_status, dpa_expiration, status, approved_at) values
(
  'd0000000-0000-0000-0000-000000000001',
  'Google Classroom',
  'Google',
  'Learning management system for organizing assignments, boosting collaboration, and fostering communication.',
  'https://classroom.google.com',
  'c0000000-0000-0000-0000-000000000001',
  '{"K-2","3-5","6-8","9-12"}',
  '{"All Subjects"}',
  'signed',
  '2027-06-30',
  'approved',
  '2025-08-15'
),
(
  'd0000000-0000-0000-0000-000000000001',
  'Kahoot!',
  'Kahoot ASA',
  'Game-based learning platform for creating and sharing quizzes, discussions, and surveys.',
  'https://kahoot.com',
  'c0000000-0000-0000-0000-000000000002',
  '{"3-5","6-8","9-12"}',
  '{"All Subjects"}',
  'signed',
  '2026-12-31',
  'approved',
  '2025-09-01'
),
(
  'd0000000-0000-0000-0000-000000000001',
  'Seesaw',
  'Seesaw Learning',
  'Student-driven digital portfolio and parent communication platform for K-5.',
  'https://web.seesaw.me',
  'c0000000-0000-0000-0000-000000000003',
  '{"K-2","3-5"}',
  '{"All Subjects"}',
  'signed',
  '2026-08-01',
  'approved',
  '2025-07-20'
),
(
  'd0000000-0000-0000-0000-000000000001',
  'Canva for Education',
  'Canva',
  'Free design platform for creating presentations, posters, and visual projects.',
  'https://www.canva.com/education',
  'c0000000-0000-0000-0000-000000000004',
  '{"6-8","9-12"}',
  '{"ELA","Art","Social Studies"}',
  'signed',
  '2027-01-15',
  'approved',
  '2025-10-10'
),
(
  'd0000000-0000-0000-0000-000000000001',
  'Read&Write by Texthelp',
  'Texthelp',
  'Literacy support toolbar with text-to-speech, dictionaries, and writing aids.',
  'https://www.texthelp.com/products/read-and-write-education',
  'c0000000-0000-0000-0000-000000000005',
  '{"3-5","6-8","9-12"}',
  '{"ELA","Special Education"}',
  'signed',
  '2026-06-30',
  'approved',
  '2025-08-05'
),
(
  'd0000000-0000-0000-0000-000000000001',
  'Desmos',
  'Amplify',
  'Free graphing calculator and interactive math activities for grades 6-12.',
  'https://www.desmos.com',
  'c0000000-0000-0000-0000-000000000002',
  '{"6-8","9-12"}',
  '{"Math"}',
  'signed',
  '2027-03-01',
  'approved',
  '2025-09-15'
);
