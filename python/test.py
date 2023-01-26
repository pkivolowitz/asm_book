from ctypes import *
so_file  = "./my_square.so"
my_funcs = CDLL(so_file)
print(my_funcs.square(10))
