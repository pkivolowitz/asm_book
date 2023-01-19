#!/bin/bash
file_list=`find . -print | grep -i ".md"`

for element in $file_list
do
	dir=`dirname ${element}`
	cd $dir
	md_name=`basename ${element} .md`
    pdf_name=${md_name}.pdf
    md_name=${md_name}.md
    if [ ! -f $pdf_name ]
    then
        echo Generating missing PDF file in $dir for $md_name
        pandoc $md_name -o $pdf_name
        cd - > /dev/null
        continue
    fi
    md_date=`date -r ${md_name} +%s`
    pdf_date=`date -r ${pdf_name} +%s`
    if [ $pdf_date -lt $md_date ];
    then
        #echo Is $pdf_date greater than $md_date 
        echo Freshening $pdf_name in $dir
        pandoc $md_name -o $pdf_name
    fi 
	cd - > /dev/null
done

