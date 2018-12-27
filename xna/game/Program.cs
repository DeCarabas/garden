using System;
using Microsoft.Xna.Framework;

namespace Garden
{
    class Program
    {
        static void Main(string[] args)
        {
            try
            {
                new GardenGame().Run();
            }
            catch (Exception e)
            {
                Console.WriteLine("SAD: {0}", e);
            }
        }
    }
}
