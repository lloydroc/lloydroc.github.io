---
title: Movement in Emacs
date: "2021-04-06"
categories:
  - emacs
---

# {{ <title> }}

A little cheat sheet for movement in `emacs`. Tried to capture all the ways you can move up, down, left and right in a buffer.

# Moving by Character and Line

Think *next* and *previous* for lines, and *backward* and *forward* for characters.

```
                   Previous Line C-p
                           ^
                           |
Previous Character C-b <---+---> Next Character C-f
                           |
		           v
                     Next Line C-n

```

# Moving by Word and Sentence


```
            Backward Sentence M-a
                      ^
                      |
Backward Word M-b <---+---> Forward Word M-f
                      |
		      v
            Forward Sentence M-e

```

# Moving to Beginning of Line and Buffer

```
                Buffer Start M-<
                       ^
                       |
Line Beginning C-a <---+---> Line End C-e
                       |
		       v
                 Buffer End M->
```

# Moving to first non-whitespace Character

The `M-m` will run `back-to-indentation`.

```
M-m
```

# Moving by Page

```
Back Page C-x [
     ^
     |
     |
     v
Forward Page C-x ]

```

# Moving by Screen


```
Previous Screen M-v
       ^
       |
       |
       v
Forward Screen C-v
```

# Centering Point

```
Center Cursor C-I
```

# Searching

```
Reverse Search M-r
      ^
      |
      |
      v
Forward Search M-s
```

To repeat the search type `C-r`

# Going to a line number

```
M-g M-g
```