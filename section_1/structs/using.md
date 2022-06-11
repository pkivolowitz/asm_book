# Section 1 / Using Structs

This topic has already been covered indirectly by examples provided in:

* [alignment](./alignment.md)
* and [defining](./defining.md)

To summarize using `structs`:

* All `structs` have a base address

* The base address corresponds to the beginning of the first data member

* All subsequent data members are offsets relative to the first

* In order to use a `struct` correctly, you must have first calculated the offsets of each data member

* Sometimes there will be padding between data members due to the need to align all data members on natural boundaries.
