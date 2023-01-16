#!/bin/bash
file_list=`git diff --name-only main | grep -i ".md"`

for element in "${file_list[@]}"
do
    echo "input: " $element ${element::-2}.pdf
done

