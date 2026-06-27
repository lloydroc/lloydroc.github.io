---
categories: ["c"]
comments: true
date: "2019-07-26T22:23:08Z"
title: A Useful Linked List
aliases:
  - /c/linked/list/2019/07/26/useful-linked-list.html
---

# {{< title >}}}

In this post we will create a useful Linked List in the C Programming Language. This is opposed to all the useless linked lists that I've seen on the internet. They are numerious, typically written by academics that haven't much experience programming. It's not the logic or syntax that is bad, but the API and functions they create that make the usage of the Linked List obtuse and awkward. This implementation of a Linked List in C is something meant to be used over and over again in projects.

## How to use the Linked List

It's best to see how the Linked List is used first before we go into the API and implementation. Let's look at a test case which will illustrate how to use the Linked List. An easy, clear and simple usage is what makes the Linked List useful after all.

{{< highlight c >}}
// file listtest.c
#include "list.h"
#include "assert.h"

#include <stdio.h>

/* A function to free an element of the linked list.
 * This is used when we remove elements from the list
 * so we don't get memory leaks
 */
void myfree(void *data)
{
  free(data);
}

/* A function to compare elements of the list.
 * This is used so we can compare if one element
 * is equal to another element. The return of 0
 * will indicate they are equal and all other
 * values will be not-equal.
 */
int match(void *vstr1, void* vstr2)
{
  char *str1 = (char *) vstr1;
  char *str2 = (char *) vstr2;
  int compare;
  if(vstr1 == NULL && vstr2 == NULL) return 0;
  if(vstr1 != NULL && vstr2 == NULL) return -1;
  if(vstr1 == NULL && vstr2 != NULL) return 1;
  compare = strcmp(str1,str2);
  return compare;
}

int main(int argc, char *argv[])
{
  // this is THE linked list
  struct List list;

  // Make some data to put elements to put in the list
  char *elem0 = strdup("0");
  char *elem1 = strdup("1");
  char *elem2 = strdup("2");
  char *elem3 = strdup("3");
  char *elem4 = strdup("4");
  char *elem5 = strdup("5");
  char *elem6 = strdup("swap");

  // a pointer to a char that we'll use for utility
  char *telem;

  // intialize the list, we have to pass in a function
  // to free each element as well as a function to
  // compare elements
  list_init(&list,match,myfree);

  // check the size is zero
  assert(list_size(&list) == 0);

  // add elements to the end or "tail"
  assert(list_add_last(&list,(void *)elem0) == 0);
  assert(list_add_last(&list,(void *)elem1) == 0);
  assert(list_add_last(&list,(void *)elem2) == 0);
  assert(list_add_last(&list,(void *)elem3) == 0);
  assert(list_add_last(&list,(void *)elem4) == 0);
  assert(list_add_last(&list,(void *)elem5) == 0);

  // get the first element or the "head"
  telem = (char *) list_get_first(&list);
  assert(strcmp(telem,"0") == 0);

  // get the last element or the "tail"
  telem = (char *) list_get_last(&list);
  assert(strcmp(telem,"5") == 0);

  assert(list_size(&list) == 6);

  // find the index of elements in the list
  assert(list_index_of(&list,"0") == 0);
  assert(list_index_of(&list,"2") == 2);
  assert(list_index_of(&list,"5") == 5);
  assert(list_index_of(&list,"777") == -1);

  // see if the list contains elements
  assert(list_contains(&list,"Larry") == 0);
  assert(list_contains(&list,NULL) == 0);
  assert(list_contains(&list,"0") == 1);
  assert(list_contains(&list,"5") == 1);

  // remove elements that are not in the list
  // will have a non-zero value
  assert(list_remove_index(&list, -1) == -1);
  assert(list_remove_index(&list, 6) == -1);

  // removing elements that are in the list
  // will return a zero value for success
  assert(list_remove_index(&list, 5) == 0);
  assert(list_remove(&list,"3") == 0);
  assert(list_remove(&list,"4") == 0);
  assert(list_remove_index(&list,0) == 0);
  assert(list_remove(&list,"1") == 0);

  // set a specific element in the list with elem6
  assert(list_set(&list,0,(void *)elem6) == 0);
  assert(list_contains(&list,elem6) == 1);
  assert(list_contains(&list,"2") == 0);

  assert(list_size(&list) == 1);

  // destroy the list, which will also free
  // all the elements so we don't have memory
  // leaks
  assert(list_destroy(&list) == 1);

  return 0;
}
{{< / highlight >}}

## The Linked List API

For the Linked List API we will have the ability to add to the beginning or "head" of the list, as well as, the end or "tail" of the list. As we saw above to create a list a function to remove an element of the list must be provided, as well as, a function to compare elements. With these functions when we remove elements or destroy the list we can free all the memory that was allocated for the list elements. We can also find the index of an element, or if the list contains an element. This implementation will return 0 on success and -1 for failure. For example, to find if an element is in the list we will return 0 if it is in the list, and -1 if it is not in the list.

{{< highlight c >}}
// file list.h
#ifndef LIST_H
#define LIST_H

#include <stdlib.h>
#include <string.h>

struct ListElement {
  void *data;
  struct ListElement *next;
};

struct List {
  size_t size;
  int (*match)(void *data1, void *data2);
  void (*destroy)(void *data);
  struct ListElement *first;
  struct ListElement *last;
};

void list_init(struct List *list, int (*match)(void *,void*), void (*destroy)(void *data));

size_t list_destroy(struct List *list);

int list_add_first(struct List *list, void *data);

int list_add_last(struct List *list, void *data);

void* list_get_first(struct List *list);

void* list_get_last(struct List *list);

void* list_get_index(struct List *list, int index);

int list_contains(struct List *list, void *data);

int list_index_of(struct List *list, void *data);

int list_set(struct List *list, int index, void *data);

int list_remove(struct List *list, void *data);

int list_remove_index(struct List *list, int index);

size_t list_size(struct List* list);

#endif
{{< / highlight >}}

## Linked List Implementation

Now the implemenation of the Linked List. It is pretty basic and written to be able to debug easily in the debugger.

{{< highlight c >}}
// file list.c
#include "list.h"

void list_init(struct List *list, int (*match)(void *,void*), void (*destroy)(void *data))
{
  list->size = 0;
  list->match = match;
  list->destroy = destroy;
  list->first = NULL;
  list->last = NULL;

  return;
}

size_t list_destroy(struct List *list)
{
  size_t num_removed = 0;
  while(list_size(list) > 0)
  {
    list_remove_index(list, 0);
    num_removed++;
  }

  memset(list,0,sizeof(struct List));
  return num_removed;
}

int list_add_first(struct List *list, void *data)
{
  struct ListElement *new_element;
  size_t element_size = sizeof(struct ListElement);

  new_element = (struct ListElement *) malloc(element_size);
  if(new_element == NULL)
  {
    return -1;
  }

  new_element->data = (void *)data;
  new_element->next = list->first;
  list->first = new_element;

  if(list_size(list) == 0)
  {
    list->last = new_element;
  }

  list->size++;
  return 0;
}

int list_add_last(struct List *list, void *data)
{
  struct ListElement *new_element;
  size_t element_size = sizeof(struct ListElement);

  new_element = (struct ListElement *) malloc(element_size);
  if(new_element == NULL)
  {
    return -1;
  }

  new_element->data = (void *)data;
  new_element->next = NULL;

  if(list_size(list) == 0)
  {
    list->first= new_element;
  }
  else
  {
    list->last->next = new_element;
  }

  list->last = new_element;

  list->size++;
  return 0;
}

void* list_get_first(struct List *list)
{
  if(list->size == 0)
  {
    return NULL;
  }

  return list->first->data;
}

void* list_get_last(struct List *list)
{
  if(list->size == 0)
  {
    return NULL;
  }

  return list->last->data;
}

void* list_get_index(struct List *list, int index)
{
  struct ListElement *current = list->first;
  size_t len = list->size;

  if(len == 0)
  {
    return NULL;
  }

  if(index < 0 || index >= len)
  {
    return NULL;
  }

  for(int i = 0; i < len; i++)
  {
    if(i == index)
    {
      return current->data;
    }
    current = current->next;
  }

  return NULL;
}

int list_contains(struct List *list, void *data)
{
  return list_index_of(list,data) != -1;
}

int list_index_of(struct List *list, void *data)
{
  struct ListElement *current = list->first;
  int match_result;
  int index = 0;

  if(current == NULL)
  {
    return -1;
  }

  if(list->match == NULL)
  {
    return -1;
  }

  do
  {
    match_result = list->match(data,current->data);
    if(!match_result)
    {
      return index;
    }
    index++;
    current = current->next;
  } while(current != NULL);

  return -1;
}

int list_set(struct List *list, int index, void *data)
{
  struct ListElement *current = list->first;
  int count = 0;

  if(index < 0 || index >= list->size)
  {
    return -1;
  }

  while(current != NULL)
  {
    if(count == index)
    {
      list->destroy(current->data);
      current->data = data;
      return 0;
    }
    current = current->next;
    count++;
  }

  return -1;
}

int list_remove(struct List *list, void *data)
{
  struct ListElement *current = list->first;
  struct ListElement *prev = list->first;
  int match_result;

  if(current == NULL)
  {
    return -1;
  }

  if(list->match == NULL)
  {
    return -1;
  }

  do
  {
    match_result = list->match(data,current->data);
    if(match_result)
    {
      prev = current;
      current = current->next;
      continue;
    }

    // we've found a match
    if(list->destroy != NULL)
    {
      list->destroy(current->data);
    }

    if(list->size == 1)
    {
      list->first = NULL;
      list->last = NULL;
    }
    // removing the first
    else if(current == list->first)
    {
      list->first = current->next;
    }
    // removing the last
    else if(current == list->last)
    {
      list->last = prev;
      prev->next = NULL;
    }
    // removing the middle
    else
    {
      prev->next = current->next;
    }

    free(current);
    list->size--;

    return 0;
  } while(current != NULL);

  return -1;
}

int list_remove_index(struct List *list, int index)
{
  struct ListElement *current = list->first;
  struct ListElement *prev = list->first;
  int count = 0;

  if(current == NULL)
  {
    return -1;
  }

  if(index < 0 || index >= list->size)
  {
    return -1;
  }

  do
  {
    if(count != index)
    {
      count++;
      prev = current;
      current = current->next;
      continue;
    }

    // index matches
    if(list->destroy != NULL)
    {
      list->destroy(current->data);
    }

    if(list->size == 1)
    {
      list->first = NULL;
      list->last = NULL;
    }
    // removing the first
    else if(current == list->first)
    {
      list->first = current->next;
    }
    // removing the last
    else if(current == list->last)
    {
      list->last = prev;
      prev->next = NULL;
    }
    // removing the middle
    else
    {
      prev->next = current->next;
    }
    free(current);
    list->size--;
    return 0;

  } while(current != NULL);

  return -1;
}


size_t list_size(struct List *list)
{
  return list->size;
}
{{< / highlight >}}
