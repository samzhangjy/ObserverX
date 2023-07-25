-- from https://github.com/amutu/zhparser#example
-- create the extension
CREATE
EXTENSION zhparser;

-- make test configuration using parser
CREATE
TEXT SEARCH CONFIGURATION chinese (PARSER = zhparser);

-- add token mapping
ALTER
TEXT SEARCH CONFIGURATION chinese ADD MAPPING FOR n,v,a,i,e,l WITH simple;
