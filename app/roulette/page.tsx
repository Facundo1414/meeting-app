'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { User } from '@/lib/auth-supabase';
import { DesktopSidebar } from '@/components/desktop-sidebar';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Dices,
  Sparkles,
  X,
  Edit2,
  Check,
  History,
  FolderOpen,
  Shuffle
} from 'lucide-react';
import { toast } from 'sonner';

interface RouletteItem {
  id: string;
  text: string;
  color: string;
  image?: string;
}

interface SpinHistory {
  id: string;
  result: string;
  timestamp: number;
  spunBy: string;
}

interface Category {
  id: string;
  name: string;
  emoji: string;
  items: string[];
  images?: string[];
}

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8B500', '#FF8C00',
  '#00CED1', '#FF69B4', '#32CD32', '#FFD700'
];

const PRESET_CATEGORIES: Category[] = [
  {
    id: 'que-hacer-hoy',
    name: 'Qué hacer hoy',
    emoji: '🎯',
    items: [
      'Ver una película juntos',
      'Cocinar algo nuevo',
      'Salir a caminar',
      'Noche de juegos de mesa',
      'Maratón de series',
      'Picnic en casa',
      'Sesión de fotos juntos',
      'Karaoke en casa',
      'Hacer un postre',
      'Noche de masajes',
      'Ver fotos viejas juntos',
      'Armar un rompecabezas',
      'Videollamada con amigos',
      'Tarde de lectura',
      'Hacer ejercicio juntos',
      'Ordenar algo del depto',
      'Probar un restaurant nuevo',
      'Ir al cine',
      'Pasear en auto sin destino',
      'Quedarse en la cama todo el día'
    ]
  },
  {
    id: 'planes-finde',
    name: 'Planes de fin de semana',
    emoji: '🌟',
    items: [
      'Escapada de un día',
      'Brunch fuera de casa',
      'Ir a una feria/mercado',
      'Día de spa en casa',
      'Visitar un museo',
      'Ir a un parque',
      'Cine + cena',
      'Visitar familia',
      'Cocinar un almuerzo elaborado',
      'Día de shopping',
      'Hacer un asado',
      'Explorar un barrio nuevo',
      'Día de peli + manta',
      'Limpieza general juntos',
      'Planear próximo viaje',
      'Hacer algo al aire libre',
      'Visitar amigos',
      'Tarde de café y charla',
      'Noche romántica',
      'No hacer absolutamente nada'
    ]
  },
  {
    id: 'preguntas',
    name: 'Preguntas para conocerse',
    emoji: '💭',
    items: [
      '¿Cuál es tu recuerdo favorito de nosotros?',
      '¿Qué es lo que más te gusta de mí?',
      '¿Dónde te ves en 5 años?',
      '¿Cuál es tu mayor miedo?',
      '¿Qué sueño no me has contado?',
      '¿Cuál fue el momento más feliz de tu vida?',
      '¿Qué cambiarías de tu pasado?',
      '¿Cuál es tu fantasía de viaje?',
      '¿Qué admirás de tus padres?',
      '¿Cuál es tu comfort food?',
      '¿Qué harías si ganaras la lotería?',
      '¿Cuál es tu peor hábito?',
      '¿Qué canción te recuerda a nosotros?',
      '¿Qué es lo que más te estresa?',
      '¿Cuándo fue la última vez que lloraste?',
      '¿Qué es algo que siempre quisiste aprender?',
      '¿Cuál es tu mayor orgullo?',
      '¿Qué te hace sentir amado/a?',
      '¿Cuál fue tu primera impresión de mí?',
      '¿Hay algo que no te animás a decirme?'
    ]
  },
  {
    id: 'retos',
    name: 'Retos divertidos',
    emoji: '🔥',
    items: [
      'Bailar una canción completa',
      'Imitar al otro por 5 minutos',
      'Decir 10 cosas que amás del otro',
      'No usar el celular por 2 horas',
      'Cocinar con los ojos vendados',
      'Hacer 20 sentadillas',
      'Cantar una canción a capella',
      'Contar un secreto vergonzoso',
      'Dar un masaje de 10 minutos',
      'Hacer el desayuno mañana',
      'Organizar una cita sorpresa',
      'No quejarse por 24 horas',
      'Escribir una carta de amor',
      'Hacer una llamada sin reírse',
      'Aguantar cosquillas 30 segundos',
      'Contar un chiste malo',
      'Actuar una escena de película',
      'Decir algo lindo en otro idioma',
      'Hacer la cena de esta semana',
      'Planificar una sorpresa para el otro'
    ]
  },
  {
    id: 'posiciones',
    name: 'Posiciones',
    emoji: '🔞',
    items: [
      'El ángel de nieve',
      'El estandarte',
      'La mariposa reclinada',
      'El portátil',
      'La cobra',
      'El acróbata',
      'La isla',
      'El 69',
      'La vaquera invertida',
      'El trono del rey'
    ],
    images: [
      'https://hips.hearstapps.com/hmg-prod/images/11-el-angel-de-nieve-1665508273.jpg?crop=1xw:1xh;center,top',
      'https://hips.hearstapps.com/hmg-prod/images/12-el-estandarte-1665508338.jpg?crop=1xw:1xh;center,top',
      'https://hips.hearstapps.com/hmg-prod/images/13-la-mariposa-reclinada-1665508388.jpg?crop=1xw:1xh;center,top',
      'https://hips.hearstapps.com/hmg-prod/images/14-el-porttil-1665508423.jpg?crop=1xw:1xh;center,top',
      'https://hips.hearstapps.com/hmg-prod/images/10-la-cobra-1660123794.jpg?crop=1.00xw:0.722xh;0,0.109xh',
      'https://hips.hearstapps.com/hmg-prod/images/08-el-acro-bata-1660123794.jpg?crop=1.00xw:0.722xh;0,0.132xh',
      'https://hips.hearstapps.com/hmg-prod/images/06-la-isla-1660123794.jpg?crop=1.00xw:0.695xh;0,0.0975xh',
      'https://hips.hearstapps.com/hmg-prod/images/01-69-1646163942.jpg?crop=1.00xw:0.518xh;0,0.249xh',
      'https://hips.hearstapps.com/hmg-prod/images/02-la-vaquera-o-amazona-invertida-1646163936.jpg?crop=1.00xw:0.651xh;0,0.0852xh',
      'https://hips.hearstapps.com/hmg-prod/images/12-el-trono-del-rey-1646163947.jpg?crop=1.00xw:0.800xh;0,0.0811xh'
    ]
  }
];

const STORAGE_KEY = 'roulette_items';
const HISTORY_KEY = 'roulette_history';

export default function RoulettePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [items, setItems] = useState<RouletteItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedItem, setSelectedItem] = useState<RouletteItem | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [spinHistory, setSpinHistory] = useState<SpinHistory[]>([]);
  const [showCategories, setShowCategories] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadCategory = useCallback((category: Category) => {
    const newItems: RouletteItem[] = category.items.map((text, index) => ({
      id: `${Date.now()}-${index}`,
      text,
      color: COLORS[index % COLORS.length],
      image: category.images?.[index],
    }));
    setItems(newItems);
    setCurrentCategory(category.name);
    setShowCategories(false);
    setShowResult(false);
    setSelectedItem(null);
    toast.success(`${category.emoji} Categoría "${category.name}" cargada`);
  }, []);

  const shuffleItems = useCallback(() => {
    if (items.length < 2) return;
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    setItems(shuffled.map((item, index) => ({
      ...item,
      color: COLORS[index % COLORS.length],
    })));
    toast.success('🔀 Opciones mezcladas');
  }, [items]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/');
      return;
    }
    const user: User = JSON.parse(userData);
    setCurrentUser(user);

    // Load dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add('dark');
    }

    // Load saved items
    const savedItems = localStorage.getItem(STORAGE_KEY);
    if (savedItems) {
      setItems(JSON.parse(savedItems));
    } else {
      // Default items
      setItems([
        { id: '1', text: 'Opción 1', color: COLORS[0] },
        { id: '2', text: 'Opción 2', color: COLORS[1] },
        { id: '3', text: 'Opción 3', color: COLORS[2] },
        { id: '4', text: 'Opción 4', color: COLORS[3] },
      ]);
    }

    // Load history
    const savedHistory = localStorage.getItem(HISTORY_KEY);
    if (savedHistory) {
      setSpinHistory(JSON.parse(savedHistory));
    }
  }, [router]);

  // Save items when they change
  useEffect(() => {
    if (items.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items]);

  // Draw roulette
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || items.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    const sliceAngle = (2 * Math.PI) / items.length;

    items.forEach((item, i) => {
      const startAngle = i * sliceAngle;
      const endAngle = (i + 1) * sliceAngle;

      // Draw slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = item.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 12px system-ui';
      ctx.shadowColor = 'white';
      ctx.shadowBlur = 2;
      
      // Truncate text if too long
      let text = item.text;
      if (text.length > 15) {
        text = text.substring(0, 12) + '...';
      }
      ctx.fillText(text, radius - 15, 5);
      ctx.restore();
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 25, 0, 2 * Math.PI);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();

    // Draw pointer (arrow at top)
    ctx.beginPath();
    ctx.moveTo(centerX - 15, 5);
    ctx.lineTo(centerX + 15, 5);
    ctx.lineTo(centerX, 35);
    ctx.closePath();
    ctx.fillStyle = '#FFD700';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

  }, [items, rotation]);

  const addItem = useCallback(() => {
    if (!newItemText.trim()) {
      toast.error('Escribe algo para agregar');
      return;
    }

    const newItem: RouletteItem = {
      id: Date.now().toString(),
      text: newItemText.trim(),
      color: COLORS[items.length % COLORS.length],
    };

    setItems(prev => [...prev, newItem]);
    setNewItemText('');
    toast.success('Opción agregada');
  }, [newItemText, items.length]);

  const removeItem = useCallback((id: string) => {
    if (items.length <= 2) {
      toast.error('Necesitas al menos 2 opciones');
      return;
    }
    setItems(prev => prev.filter(item => item.id !== id));
    toast.success('Opción eliminada');
  }, [items.length]);

  const startEdit = useCallback((item: RouletteItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editText.trim()) {
      toast.error('El texto no puede estar vacío');
      return;
    }
    setItems(prev => prev.map(item => 
      item.id === editingId ? { ...item, text: editText.trim() } : item
    ));
    setEditingId(null);
    setEditText('');
  }, [editingId, editText]);

  const spinRoulette = useCallback(() => {
    if (isSpinning || items.length < 2) return;

    setIsSpinning(true);
    setShowResult(false);
    setSelectedItem(null);

    // Random spins (5-10 full rotations) + random final position
    const spins = 5 + Math.random() * 5;
    const randomAngle = Math.random() * 360;
    const totalRotation = spins * 360 + randomAngle;
    
    // Animate
    let currentRotation = rotation;
    const targetRotation = rotation + totalRotation;
    const duration = 4000; // 4 seconds
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease out cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      currentRotation = rotation + (totalRotation * easeOut);
      setRotation(currentRotation);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Calculate winner
        const normalizedRotation = currentRotation % 360;
        const sliceAngle = 360 / items.length;
        // The pointer is at top (270 degrees in standard position)
        const pointerAngle = (360 - normalizedRotation + 270) % 360;
        const winnerIndex = Math.floor(pointerAngle / sliceAngle) % items.length;
        
        const winner = items[winnerIndex];
        setSelectedItem(winner);
        setShowResult(true);
        setIsSpinning(false);

        // Save to history
        const historyEntry: SpinHistory = {
          id: Date.now().toString(),
          result: winner.text,
          timestamp: Date.now(),
          spunBy: currentUser?.username || 'Usuario'
        };
        const newHistory = [historyEntry, ...spinHistory].slice(0, 50);
        setSpinHistory(newHistory);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      }
    };

    requestAnimationFrame(animate);
  }, [isSpinning, items, rotation, spinHistory, currentUser]);

  const clearAll = useCallback(() => {
    if (confirm('¿Eliminar todas las opciones?')) {
      setItems([
        { id: '1', text: 'Opción 1', color: COLORS[0] },
        { id: '2', text: 'Opción 2', color: COLORS[1] },
      ]);
      toast.success('Opciones reiniciadas');
    }
  }, []);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleDarkMode = useCallback(() => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('user');
    router.push('/');
  }, [router]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <>
      <DesktopSidebar 
        user={currentUser}
        unreadCount={unreadCount}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onLogout={handleLogout}
      />
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white lg:ml-64">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-black/50 backdrop-blur-lg border-b border-white/10">
          <div className="flex items-center justify-between p-4 max-w-4xl mx-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/messages')}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Dices className="w-5 h-5 text-yellow-400" />
              Ruleta
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(!showHistory)}
              className="text-white hover:bg-white/10"
            >
              <History className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Desktop wrapper para centrar contenido */}
        <div className="max-w-4xl mx-auto px-4 lg:px-6 xl:px-8">
          <div className="py-4 pb-24 space-y-6">
        {/* Roulette Canvas */}
        <div className="flex justify-center">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={300}
              height={300}
              className="rounded-full shadow-2xl shadow-purple-500/20"
            />
            {isSpinning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Spin Button */}
        <div className="flex justify-center">
          <Button
            onClick={spinRoulette}
            disabled={isSpinning || items.length < 2}
            className="px-8 py-6 text-lg font-bold bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 rounded-full shadow-lg shadow-orange-500/30 disabled:opacity-50"
          >
            {isSpinning ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin">🎰</div>
                Girando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Dices className="w-5 h-5" />
                ¡GIRAR!
              </span>
            )}
          </Button>
        </div>

        {/* Result */}
        {showResult && selectedItem && (
          <Card className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/50 p-6 text-center animate-in fade-in zoom-in duration-300">
            <p className="text-sm text-green-300 mb-2">🎉 ¡Resultado!</p>
            <p className="text-2xl font-bold text-white mb-4">{selectedItem.text}</p>
            {selectedItem.image && (
              <div className="mt-4 flex justify-center">
                <img 
                  src={selectedItem.image} 
                  alt={selectedItem.text}
                  className="max-w-[250px] max-h-[250px] rounded-lg shadow-lg object-contain bg-white"
                />
              </div>
            )}
          </Card>
        )}

        {/* Category indicator */}
        {currentCategory && (
          <div className="text-center">
            <span className="text-sm text-white/50">Categoría actual: </span>
            <span className="text-sm text-purple-300 font-medium">{currentCategory}</span>
          </div>
        )}

        {/* Categories Button */}
        <div className="flex gap-2">
          <Button
            onClick={() => setShowCategories(!showCategories)}
            variant="outline"
            className="flex-1 border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Categorías
          </Button>
          <Button
            onClick={shuffleItems}
            variant="outline"
            className="border-blue-500/50 text-blue-300 hover:bg-blue-500/20"
            disabled={items.length < 2}
          >
            <Shuffle className="w-4 h-4" />
          </Button>
        </div>

        {/* Categories Panel */}
        {showCategories && (
          <Card className="bg-white/5 border-white/10 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <h3 className="font-semibold text-white/80 mb-3 flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Cargar categoría predefinida
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {PRESET_CATEGORIES.map((category) => (
                <Button
                  key={category.id}
                  onClick={() => loadCategory(category)}
                  variant="ghost"
                  className="justify-start text-left h-auto py-3 px-4 bg-white/5 hover:bg-white/10 text-white/90"
                >
                  <span className="text-xl mr-3">{category.emoji}</span>
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-xs text-white/50">{category.items.length} opciones</p>
                  </div>
                </Button>
              ))}
            </div>
            <p className="text-xs text-white/40 mt-3 text-center">
              ⚠️ Cargar una categoría reemplaza las opciones actuales
            </p>
          </Card>
        )}

        {/* Add Item */}
        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex gap-2">
            <Input
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addItem()}
              placeholder="Nueva opción..."
              className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
            />
            <Button
              onClick={addItem}
              className="bg-purple-500 hover:bg-purple-600"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
        </Card>

        {/* Items List */}
        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white/80">Opciones ({items.length})</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Reiniciar
            </Button>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                {editingId === item.id ? (
                  <>
                    <Input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                      className="flex-1 h-8 bg-white/10 border-white/20 text-white text-sm"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={saveEdit}
                      className="h-8 w-8 text-green-400 hover:text-green-300"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                      className="h-8 w-8 text-white/50 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-white/90 text-sm truncate">{item.text}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(item)}
                      className="h-8 w-8 text-white/50 hover:text-white"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeItem(item.id)}
                      className="h-8 w-8 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* History Panel */}
        {showHistory && (
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white/80">Historial</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSpinHistory([]);
                  localStorage.removeItem(HISTORY_KEY);
                  toast.success('Historial borrado');
                }}
                className="text-white/50 hover:text-white text-xs"
              >
                Limpiar
              </Button>
            </div>
            
            {spinHistory.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-4">
                Sin historial aún
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {spinHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2 rounded bg-white/5 text-sm"
                  >
                    <span className="text-white/90 truncate flex-1">{entry.result}</span>
                    <span className="text-white/40 text-xs ml-2">{formatTime(entry.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
        </div>
      </div>
      </div>
    </>
  );
}
