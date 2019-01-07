using System;
using System.Collections.Generic;
using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using Microsoft.Xna.Framework.Input;

namespace Garden
{
    static class RandomExtensions
    {
        public static float NextFloat(this Random random) =>
            (float)random.NextDouble();
    }

    static class MathF
    {
        public static float Sin(float angle) => (float)Math.Sin(angle);
        public static float Cos(float angle) => (float)Math.Cos(angle);
        public static float Unit(float value) => MathHelper.Clamp(value, 0, 1);
    }

    class DrawingContext
    {
        static readonly VertexPositionColorTexture[] unitSquare = new[] {
                new VertexPositionColorTexture(
                    new Vector3(-0.5f, -0.5f, 0),
                    Color.White,
                    new Vector2(-1, -1)
                ),
                new VertexPositionColorTexture(
                    new Vector3(0.5f, -0.5f, 0),
                    Color.White,
                    new Vector2(1, -1)
                ),
                new VertexPositionColorTexture(
                    new Vector3(0.5f, 0.5f, 0),
                    Color.White,
                    new Vector2(1, 1)
                ),
                new VertexPositionColorTexture(
                    new Vector3(-0.5f, -0.5f, 0),
                    Color.White,
                    new Vector2(-1, -1)
                ),
                new VertexPositionColorTexture(
                    new Vector3(0.5f, 0.5f, 0),
                    Color.White,
                    new Vector2(1, 1)
                ),
                new VertexPositionColorTexture(
                    new Vector3(-0.5f, 0.5f, 0),
                    Color.White,
                    new Vector2(-1, 1)
                ),
            };

        public DrawingContext(GraphicsDevice device, Effect shapesEffect)
        {
            this.device = device;
            this.shapesEffect = shapesEffect;
            this.worldMatrix = this.shapesEffect.Parameters["World"];
            this.viewMatrix = this.shapesEffect.Parameters["View"];
            this.projectionMatrix = this.shapesEffect.Parameters["Projection"];
            this.circleTechnique = this.shapesEffect.Techniques["DrawCircles"];
            this.squareTechnique = this.shapesEffect.Techniques["DrawSquares"];
        }

        readonly GraphicsDevice device;
        readonly Effect shapesEffect;
        readonly EffectParameter worldMatrix;
        readonly EffectParameter viewMatrix;
        readonly EffectParameter projectionMatrix;
        readonly EffectTechnique circleTechnique;
        readonly EffectTechnique squareTechnique;

        public Matrix View
        {
            get { return this.viewMatrix.GetValueMatrix(); }
            set { this.viewMatrix.SetValue(value); }
        }

        public Matrix Projection
        {
            get { return this.projectionMatrix.GetValueMatrix(); }
            set { this.projectionMatrix.SetValue(value); }
        }

        public void DrawCircle(HSBColor idColor, Vector3 position, float radius)
        {
            // TODO: Batch/cache.
            var rgba = idColor.ToColor();
            var temp = (VertexPositionColorTexture[])unitSquare.Clone();
            for (int i = 0; i < temp.Length; i++)
            {
                temp[i].Color = rgba;
            }

            Matrix world =
                Matrix.CreateScale(radius * 2) *
                Matrix.CreateTranslation(position);
            this.worldMatrix.SetValue(world);
            this.shapesEffect.CurrentTechnique = this.circleTechnique;
            foreach (EffectPass pass in this.shapesEffect.CurrentTechnique.Passes)
            {
                pass.Apply();
                this.device.DrawUserPrimitives(
                    PrimitiveType.TriangleList, temp, 0, 2);
            }
        }

        public void DrawElipse(
            HSBColor idColor, Vector3 position, float radiusW, float radiusH)
        {
            // TODO: Batch/cache.
            var rgba = idColor.ToColor();
            var temp = (VertexPositionColorTexture[])unitSquare.Clone();
            for (int i = 0; i < temp.Length; i++)
            {
                temp[i].Color = rgba;
            }

            Matrix world =
                Matrix.CreateScale(radiusW * 2, radiusH * 2, 1) *
                Matrix.CreateTranslation(position);
            this.worldMatrix.SetValue(world);
            this.shapesEffect.CurrentTechnique = this.circleTechnique;
            foreach (EffectPass pass in this.shapesEffect.CurrentTechnique.Passes)
            {
                pass.Apply();
                this.device.DrawUserPrimitives(
                    PrimitiveType.TriangleList, temp, 0, 2);
            }
        }

        public void DrawSquare(
            HSBColor idColor,
            Matrix world,
            Vector3 pt0,
            Vector3 pt1,
            Vector3 pt2,
            Vector3 pt3)
        {
            var rgba = idColor.ToColor();
            var temp = (VertexPositionColorTexture[])unitSquare.Clone();
            temp[0].Position = pt0;
            temp[0].Color = rgba;
            temp[1].Position = pt1;
            temp[1].Color = rgba;
            temp[2].Position = pt2;
            temp[2].Color = rgba;

            temp[3].Position = pt0;
            temp[3].Color = rgba;
            temp[4].Position = pt2;
            temp[4].Color = rgba;
            temp[5].Position = pt3;
            temp[5].Color = rgba;

            this.worldMatrix.SetValue(world);
            this.shapesEffect.CurrentTechnique = this.squareTechnique;
            foreach (EffectPass pass in this.shapesEffect.CurrentTechnique.Passes)
            {
                pass.Apply();
                this.device.DrawUserPrimitives(
                    PrimitiveType.TriangleList, temp, 0, 2);
            }
        }
    }

    struct NodeDNA
    {
        public readonly float[] values;

        public NodeDNA(float[] values) => this.values = values;

        public float AngleSkew => this.values[0];
        public float Bushiness => this.values[1];
        public float Wiggle => this.values[2];
        public float Variation => this.values[3];
        public float Shrinkage => this.values[4];
        public float HueStart => this.values[5];
        public float HueDiff => this.values[6];
        public float Saturation => this.values[7];
        public float LeafCount => this.values[8];
        public float LeafAspect => this.values[9];
        public float LeafShape => this.values[10];
        public float FlowerCount => this.values[11];
        public float FlowerHue => this.values[12];
        public float FlowerSaturation => this.values[13];
        public float PetalAspect => this.values[14];

        public static NodeDNA Create(Random random)
        {
            var values = new float[20];
            for (int i = 0; i < values.Length; i++)
            {
                values[i] = random.NextFloat();
            }
            return new NodeDNA(values);
        }

        public void Print()
        {
            foreach (var prop in GetType().GetProperties())
            {
                const int BarLength = 30;

                float val = (float)prop.GetValue(this);
                int length = (int)(val * BarLength);
                var bar =
                    new String('=', length) +
                    new String(' ', BarLength - length);
                Console.WriteLine("{0,20}: |{1}| {2}", prop.Name, bar, val);
            }
            Console.WriteLine();
        }
    }

    // This code is based on the code originally written by Kate Compton
    // (@GalaxyKate), at http://www.galaxykate.com/apps/Prototypes/LTrees/
    class Node
    {
        public static Random random = new Random();

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
                var spread = (1.5f * this.dna.Bushiness);
                this.baseAngle =
                    parent.angle + spread * (childPct - .5f) + skew;
                this.baseAngle +=
                    this.dna.Wiggle * .1f * MathF.Sin(this.depth) *
                    this.depth;

                // Set the position relative to the parent
                var mult = 15 - 12 * this.dna.Bushiness;
                this.branchLength = .7f * mult * parent.radius;

                this.branchLength *=
                    (1 + 1 * this.dna.Variation * (random.NextFloat() - .5f));
                this.radius = parent.radius * (.6f + .3f * this.dna.Shrinkage);

                this.position = polarOffset(
                    parent.position, this.branchLength, this.baseAngle);
            }

            this.angle = this.baseAngle;
            this.idColor = makeIDColor(this.dna, this.depth);
        }

        public Node(NodeDNA dna, Vector3 pos, float angle, float radius)
        {
            this.dna = dna;
            this.position = pos;
            this.baseAngle = this.angle = angle;
            this.radius = radius;
            this.idColor = makeIDColor(this.dna, this.depth);
        }

        static HSBColor makeIDColor(NodeDNA dna, float depth)
        {
            float h = (3 + dna.HueStart + .1f * dna.HueDiff * depth);
            float s =
                (.7f + .3f * dna.Saturation * MathF.Sin(depth)) -
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
                    branches = 2;
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
                this.position = polarOffset(
                    this.parent.position, this.branchLength, this.angle);
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

                Matrix world =
                    Matrix.CreateRotationZ(angle) *
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
                        fade: -0.3f + 0.2f * MathF.Sin(j + this.depth));

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
                            0),
                        new Vector3(
                            r0 * MathF.Cos(theta),
                            r0 * MathF.Sin(theta),
                            0),
                        new Vector3(
                            r1 * MathF.Cos(theta1),
                            r1 * MathF.Sin(theta1),
                            0));
                }


                child.Draw(context);
            }

            context.DrawCircle(this.idColor, this.position, this.radius);
            if (this.children.Count == 0)
            {
                Matrix world =
                    Matrix.CreateRotationZ(this.angle) *
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
                        .7f);

                    world =
                        Matrix.CreateRotationZ(MathHelper.TwoPi / flowerCount) *
                        world;

                    var flowerCenter = Vector3.Transform(
                        new Vector3(petalH * 1.5f, 0, 0), world);
                    context.DrawElipse(
                        flowerColor,
                        flowerCenter,
                        petalH,
                        petalW);
                }
            }
        }

        static Vector3 polarOffset(Vector3 vector, float r, float theta)
        {
            Vector3 result;
            result.X = vector.X + r * MathF.Cos(theta + MathHelper.Pi);
            result.Y = vector.Y + r * MathF.Sin(theta + MathHelper.Pi);
            result.Z = vector.Z;
            return result;
        }
    }

    class KateGame : Game
    {
        GraphicsDeviceManager graphics;

        SpriteFont font;
        BasicEffect effect;
        Effect shapesEffect;
        DrawingContext drawingContext;

        Node node;

        public KateGame()
        {
            graphics = new GraphicsDeviceManager(this);
            graphics.PreferMultiSampling = true;

            Content.RootDirectory = "content";
        }

        protected override void LoadContent()
        {
            font = Content.Load<SpriteFont>("fonts/basic");
            effect = new BasicEffect(GraphicsDevice);

            shapesEffect = Content.Load<Effect>("shaders/shapes");
            shapesEffect.CurrentTechnique = shapesEffect.Techniques[0];

            drawingContext = new DrawingContext(GraphicsDevice, shapesEffect);
        }

        protected override void UnloadContent()
        {
            font = null;
            shapesEffect = null;
            drawingContext = null;
        }

        protected override void Update(GameTime gameTime)
        {
            if (Keyboard.GetState().IsKeyDown(Keys.Enter))
            {
                node = null;
            }
            if (Keyboard.GetState().IsKeyDown(Keys.Escape))
            {
                Exit();
            }
            if (node == null)
            {
                var dna = NodeDNA.Create(Node.random);
                dna.Print();
                node = new Node(
                    dna,
                    Vector3.Zero,
                    -MathHelper.PiOver2,
                    5f + (float)Node.random.NextDouble() + 4f);
                for (int i = 0; i < 10; i++)
                {
                    node.Iterate();
                }
            }
            node.Update(gameTime);
        }

        protected override void Draw(GameTime gameTime)
        {
            var background = new HSBColor(0.55f, 0.1f, 1f, 1);
            GraphicsDevice.Clear(background.ToColor());
            GraphicsDevice.RasterizerState = RasterizerState.CullNone;
            GraphicsDevice.BlendState = BlendState.AlphaBlend;

            Matrix view = Matrix.CreateLookAt(
                new Vector3(0, 0, -10),
                new Vector3(0, 0, 0),
                Vector3.UnitY) *
                Matrix.CreateScale(0.75f) *
                Matrix.CreateTranslation(0, -200, 0);
            Matrix projection = Matrix.CreateOrthographic(
                GraphicsDevice.Viewport.Width,
                GraphicsDevice.Viewport.Height,
                0.0f,
                100.0f);

            this.drawingContext.View = view;
            this.drawingContext.Projection = projection;

            this.node.Draw(this.drawingContext);
        }
    }
}
