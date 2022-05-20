long Sum(long * values, long length)
{
    long sum = 0;
    for (long i = 0; i < length; i++)
    {
        sum += values[i];
    }
    return sum;
}