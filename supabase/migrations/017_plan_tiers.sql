-- 016 added plan as nullable text; lock it down now
ALTER TABLE organizations
  ALTER COLUMN plan SET DEFAULT 'free';

UPDATE organizations SET plan = 'free' WHERE plan IS NULL;

ALTER TABLE organizations
  ALTER COLUMN plan SET NOT NULL;
