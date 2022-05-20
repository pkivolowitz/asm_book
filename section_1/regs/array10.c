#include <stdio.h>

struct Person
{
    char * fname;
    char * lname;
    int age;
};

extern int rand();
extern struct Person * FindOldestPerson(struct Person *, int);

struct Person * OriginalFindOldestPerson(struct Person * people, int length)
{
    int oldest_age = 0;
    struct Person * oldest_ptr = NULL;

    if (people)
    {
        struct Person * end_ptr = people + length;
        while (people < end_ptr)
        {
            if (people->age > oldest_age)
            {
                oldest_age = people->age;
                oldest_ptr = people;
            }
            people++;
        }
    }
    return oldest_ptr;
}

#define LENGTH  20

int main()
{
    struct Person array[LENGTH];
    for (int i = 0; i < LENGTH; i++)
    {
        array[i].age = rand() & 5000;
    }
    struct Person * oldest = FindOldestPerson(array, LENGTH);
    for (int i = 0; i < LENGTH; i++)
    {
        printf("%d", array[i].age);
        if (oldest == &array[i])
            printf("*");
        printf("\n");
    }
}
