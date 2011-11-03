#!/bin/bash
task="${1:?What task?}"
shift
eval "$@"

tmperr="$(tempfile)"
tmpout="$(tempfile)"
trap 'rm $tmperr $tmpout' EXIT

echo -en "Content-Disposition: inline;filename=\"etichette-$id-$comparator-$layout-$formato.txt\"\r\n\r\n"

./jake $task\["$id","$comparator","$layout","$formato"\] 2> "$tmperr" > "$tmpout"
if [ -s "$tmperr" ]; then
  cat "$tmperr"
else
  cat "$tmpout"
fi