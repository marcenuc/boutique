xls="${1:?Excel file name?}"
if [ $# = 2 ]; then
  csv="$2"
else
  csv="${xls%%.xls?}.csv"
fi
exec ssconvert -T 'Gnumeric_stf:stf_csv' -S "$xls" "$csv"
