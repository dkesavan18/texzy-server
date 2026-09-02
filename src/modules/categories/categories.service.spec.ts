import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category, CategoryType } from '../../database/entities';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const categoryTypesRepository = {
    find: jest.fn(),
  };

  const categoriesRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: categoriesRepository },
        {
          provide: getRepositoryToken(CategoryType),
          useValue: categoryTypesRepository,
        },
      ],
    }).compile();

    service = module.get(CategoriesService);
    jest.clearAllMocks();
  });

  describe('findAllGrouped', () => {
    it('groups active categories under their category type', async () => {
      categoryTypesRepository.find.mockResolvedValue([
        {
          categoryTypeId: 1,
          categoryType: 'business_type',
          isActive: true,
        },
        {
          categoryTypeId: 2,
          categoryType: 'business_mode',
          isActive: true,
        },
      ]);

      categoriesRepository.find.mockResolvedValue([
        {
          categoryId: '10',
          categoryName: 'Manufacturer',
          categoryTypeId: 1,
          isActive: true,
        },
        {
          categoryId: '11',
          categoryName: 'Wholesaler',
          categoryTypeId: 1,
          isActive: true,
        },
        {
          categoryId: '20',
          categoryName: 'Retail',
          categoryTypeId: 2,
          isActive: true,
        },
      ]);

      const result = await service.findAllGrouped();

      expect(result).toEqual({
        items: [
          {
            categoryTypeId: 1,
            categoryType: 'business_type',
            categories: [
              { categoryId: 10, categoryName: 'Manufacturer' },
              { categoryId: 11, categoryName: 'Wholesaler' },
            ],
          },
          {
            categoryTypeId: 2,
            categoryType: 'business_mode',
            categories: [{ categoryId: 20, categoryName: 'Retail' }],
          },
        ],
      });
    });
  });
});
