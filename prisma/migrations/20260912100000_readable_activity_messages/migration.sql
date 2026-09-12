UPDATE "ActivityLog" AS activity
SET "message" = actor."name"
  || ' moved '
  || task."title"
  || ' from '
  || CASE activity."from_status"
       WHEN 'todo' THEN 'To Do'
       WHEN 'in_progress' THEN 'In Progress'
       WHEN 'review' THEN 'In Review'
       WHEN 'done' THEN 'Done'
       ELSE COALESCE(activity."from_status"::text, 'Unknown')
     END
  || ' to '
  || CASE activity."to_status"
       WHEN 'todo' THEN 'To Do'
       WHEN 'in_progress' THEN 'In Progress'
       WHEN 'review' THEN 'In Review'
       WHEN 'done' THEN 'Done'
       ELSE COALESCE(activity."to_status"::text, 'Unknown')
     END
FROM "User" AS actor, "Task" AS task
WHERE activity."actor_id" = actor."id"
  AND activity."task_id" = task."id"
  AND activity."type" = 'TASK_STATUS_CHANGED';
