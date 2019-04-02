using System;
using System.Collections.Generic;
using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using Microsoft.Xna.Framework.Input;

namespace Garden
{
    // This code is based on the code originally written by Kate Compton
    // (@GalaxyKate), at http://www.galaxykate.com/apps/Prototypes/LTrees/
    class Node
    {
        static int NextID = 0;
        readonly List<Node> children = new List<Node>();
        readonly float radius;
        readonly int depth;
        readonly NodeDNA dna;
        readonly float baseAngle;
        readonly float branchLength;
        readonly HSBColor idColor;
        readonly Node parent;
        readonly int id;
        float angle;
        Vector3 position;

        public Node(Node parent, float childPct)
        {
            this.id = NextID++;
            this.parent = parent;

            if (parent != null)
            {
                this.depth = parent.depth + 1;
                this.dna = parent.dna;

                // As a child, offset the child index
                var skew = (float)Math.Pow(this.dna.AngleSkew - .5f, 3);
                var spread = (2f * this.dna.Bushiness);
                this.baseAngle = parent.angle + spread * (childPct - .5f) + skew;
                this.baseAngle +=
                    this.dna.Wiggle * .1f * MathF.Sin(this.depth) * this.depth;

                // Set the position relative to the parent
                var mult = 15 - 12 * this.dna.Bushiness;
                this.branchLength = .7f * mult * parent.radius;

                this.branchLength *=
                    (1 + 1 * this.dna.Variation * (NodeDNA.NextFloat() - .5f));
                this.radius = parent.radius * (.6f + .3f * this.dna.Shrinkage);

                this.position =
                    MathF.PolarOffset(
                        parent.position,
                        this.branchLength,
                        this.baseAngle
                    );
            }

            this.angle = this.baseAngle;
            this.idColor = makeIDColor(this.dna, this.depth);
        }

        public Node(NodeDNA dna, Vector3 pos)
        {
            this.dna = dna;
            this.position = pos;
            this.baseAngle = this.angle = -MathHelper.PiOver2;
            this.radius = (10f * dna.BaseRadius) + NodeDNA.NextFloat() + 4f;
            this.idColor = makeIDColor(this.dna, this.depth);
        }

        static HSBColor makeIDColor(NodeDNA dna, float depth)
        {
            float h = (3 + dna.HueStart + .1f * dna.HueDiff * depth);
            float s = (.7f + .3f * dna.Saturation * MathF.Sin(depth)) -
                (dna.Saturation * depth * .08f);
            float b = .3f + .1f * depth;
            return new HSBColor(h % 1f, MathF.Unit(s), MathF.Unit(b));
        }

        public void Iterate()
        {
            if (children.Count == 0 && radius > 2)
            {
                int branches = 1;
                if (depth % 3 == 0)
                {
                    branches = 1 + (int)(Math.Round(3 * this.dna.Bushiness));
                }

                for (float i = 0; i < branches; i++)
                {
                    float pct = (i + 0.5f) / branches;
                    this.children.Add(new Node(this, pct));
                }
            }
            else
            {
                foreach (Node child in this.children)
                {
                    child.Iterate();
                }
            }
        }

        public void Update(GameTime gameTime)
        {
            float elapsed = (float)gameTime.TotalGameTime.TotalSeconds;
            if (this.parent != null)
            {
                float angleOffset = .1f * (1.2f + this.depth) *
                    MathF.Sin(2 * elapsed + this.depth);
                angleOffset += 0.2f * MathF.Sin(this.id);

                this.angle = this.baseAngle + angleOffset;
                this.position =
                    MathF.PolarOffset(
                        this.parent.position,
                        this.branchLength,
                        this.angle
                    );
            }

            foreach (Node child in this.children)
            {
                child.Update(gameTime);
            }
        }

        public void Draw(DrawingContext context)
        {
            foreach (var child in this.children)
            {
                Vector3 edge = child.position - position;
                float length = child.branchLength;
                float angle = (float)Math.Atan2(edge.Y, edge.X);

                Matrix world = Matrix.CreateRotationZ(angle) *
                    Matrix.CreateTranslation(this.position);

                context.DrawSquare(
                    this.idColor,
                    world,
                    new Vector3(0, -this.radius, 0),
                    new Vector3(0, +this.radius, 0),
                    new Vector3(length, +child.radius, 0),
                    new Vector3(length, -child.radius, 0)
                );

                var leafCount = (float)Math.Floor(this.dna.LeafCount * 5);
                for (var j = 0; j < (int)leafCount; j++)
                {
                    HSBColor leafColor = this.idColor.Alter(
                            shade: 0.3f * MathF.Sin(j + this.depth),
                            fade: -0.3f + 0.2f * MathF.Sin(j + this.depth)
                        );

                    world =
                        Matrix.CreateTranslation(length / leafCount, 0, 0) *
                        world;

                    var r0 = 15 * this.radius * (.3f + this.dna.LeafAspect);
                    var r1 = r0 * (.7f * this.dna.LeafShape + .12f);
                    var theta = MathF.Sin(j * 3 + this.depth);
                    var dTheta = 1 / (.8f + 2 * this.dna.LeafAspect);
                    var theta0 = theta - dTheta;
                    var theta1 = theta + dTheta;

                    context.DrawSquare(
                        leafColor,
                        world,
                        new Vector3(0, 0, 0),
                        new Vector3(
                            r1 * MathF.Cos(theta0),
                            r1 * MathF.Sin(theta),
                            0
                        ),
                        new Vector3(
                            r0 * MathF.Cos(theta),
                            r0 * MathF.Sin(theta),
                            0
                        ),
                        new Vector3(
                            r1 * MathF.Cos(theta1),
                            r1 * MathF.Sin(theta1),
                            0
                        )
                    );
                }

                child.Draw(context);
            }

            context.DrawCircle(this.idColor, this.position, this.radius);
            if (this.children.Count == 0)
            {
                Matrix world = Matrix.CreateRotationZ(this.angle) *
                    Matrix.CreateTranslation(this.position);

                var flowerCount = (float)Math.Round(8 * this.dna.FlowerCount);
                var petalSize = 5 * this.radius;

                var aspect = .1f + .9f * this.dna.PetalAspect;
                var petalH = petalSize * aspect;
                var petalW = petalSize * (1 - aspect);
                for (var i = 0; i < flowerCount; i++)
                {
                    var flowerColor = new HSBColor(
                            (this.dna.FlowerHue * 1.2f + .9f) % 1f,
                            this.dna.FlowerSaturation,
                            MathF.Unit(.9f + .3f * MathF.Sin(i * 3)),
                            .7f
                        );

                    world =
                        Matrix.CreateRotationZ(MathHelper.TwoPi / flowerCount) *
                        world;

                    var flowerCenter = Vector3.Transform(
                            new Vector3(petalH * 1.5f, 0, 0),
                            world
                        );
                    context.DrawElipse(
                        flowerColor,
                        flowerCenter,
                        petalH,
                        petalW
                    );
                }
            }
        }
    }
}
