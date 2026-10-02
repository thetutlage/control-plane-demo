-- Separate database for `node ace test`, which migrates and truncates it on every run
CREATE DATABASE control_plane_test OWNER control_plane;
