KEYS user:*

HGETALL user:5

EXISTS user:5

FLUSHALL

DBSIZE

select id,username,email,is_deleted,role,deleted_at from users;
