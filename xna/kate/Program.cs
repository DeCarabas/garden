using System;

namespace Garden
{
    class Program
    {
        static void Main(string[] args)
        {
            try
            {
                new KateGame().Run();
            }
            catch (Exception e)
            {
                Console.WriteLine("SAD: {0}", e);
            }
        }
    }
}
