#!/bin/bash
#file_list=`git diff --name-only main | grep -i ".md"`
file_list=`find . -print | grep -i ".md"`

for element in $file_list
do
	dir=`dirname ${element}`
	cd $dir
	echo `pwd`
	fname=`basename ${element}`
	pandoc $fname -o ${fname::-2}pdf
	cd - > /dev/null
done

