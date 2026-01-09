Pattern
  = "#"? _ PatternContents

PatternContents
  = "(" _ Op _ (Pattern |.., _|) _ ")"
  / $[A-Za-z0-9_]+

Op
  = $[+×\-0] Integer?

Integer
  = x:$[0-9]+ { return Number(x) }

_  = [ \t\n\r]*
