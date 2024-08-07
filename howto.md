### Notes Box

!!! info
    this is the info

!!! note
    this is the info
    
!!! WARNING
    this is the info
    
!!! warning
    this is the info
    
!!! danger highlight blink "Don't try this at home"
    ...


### Code Box

``` {.py3 hl_lines="1 3" linenums="1"}
""" Bubble sort """
def bubble_sort(items):
    for i in range(len(items)):
        for j in range(len(items) - 1 - i):
            if items[j] > items[j + 1]:
                items[j], items[j + 1] = items[j + 1], items[j]
```
notes: the `hl_lines` attribute is a string of line numbers to highlight but cannot make it work, no idea why.



### How to include a file in a markdown file
https://github.com/mondeja/mkdocs-include-markdown-plugin
{% include-markdown "../../../common/hardware-connection.md" %}

~~~yaml
{% include "../examples/github-minimal.yml" %}
~~~

### ioshields

same a github badges https://shields.io/badges