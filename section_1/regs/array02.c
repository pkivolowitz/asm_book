long Sum(long * values, long length)
{
    long sum = 0;
    long * end = values + length;
    while (values < end)
    {
        sum += *(values++);
    }
    return sum;
}