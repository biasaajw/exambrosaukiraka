-- UjiAman: akun awal (sandi disimpan sebagai hash scrypt)
INSERT INTO users (username,name,kelas,role,password_hash) VALUES ('admin','Administrator',NULL,'admin','scrypt$16384$8$1$cvhWc699URDV1wmcXxHsYw==$QTZ9LPnmUHGJN5dfI3dIMht4ZDui3TRIgbpa5rZLv34=');
INSERT INTO users (username,name,kelas,role,password_hash) VALUES ('pengawas','Pengawas 1',NULL,'pengawas','scrypt$16384$8$1$oAm78btFgQFV0p5+9OCsNQ==$H6If3HFHRpUGEoom+lFrwvvb3VWyNq+sEAgnFA4Zyr4=');
INSERT INTO users (username,name,kelas,role,password_hash) VALUES ('siswa01','Siswa Uji 1','Uji','siswa','scrypt$16384$8$1$5MO6Rz7xywugoXRl2c0wpA==$CYDMTV3fknm1e7a/6XVUdl5Ycjc6E6oM2th2JL3nYwQ=');
INSERT INTO users (username,name,kelas,role,password_hash) VALUES ('siswa02','Siswa Uji 2','Uji','siswa','scrypt$16384$8$1$3IQgH2bHz0WypsW3HNW4DQ==$EYRYGB2gr3rO35s6X9iQxzrdm5AMm7uyf3D/Tn0GHDo=');
