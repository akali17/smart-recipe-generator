describe('AI Food Recognition', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/recognize');
  });

  it('hiển thị trang recognize đúng', () => {
    cy.contains('AI Food Recognition').should('be.visible');
    cy.contains('Upload ảnh').should('be.visible');
    cy.contains('Camera Realtime').should('be.visible');
  });

  it('chuyển tab camera hoạt động', () => {
    cy.contains('Camera Realtime').click();
    cy.get('video').should('exist');
  });

  it('upload ảnh hiển thị preview', () => {
    // Tạo file ảnh giả để test
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('fake-image-content'),
      fileName: 'test.jpg',
      mimeType: 'image/jpeg',
    }, { force: true });

    // Preview phải hiện ra
    cy.get('img[alt="ảnh 1"]').should('exist');
  });

  it('nút sinh công thức hiện khi có ingredients', () => {
    // Mock API response
    cy.intercept('POST', '/api/recognize', {
      statusCode: 200,
      body: { ingredients: ['egg', 'tomato'] }
    }).as('recognize');

    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('fake-image'),
      fileName: 'food.jpg',
      mimeType: 'image/jpeg',
    }, { force: true });

    cy.wait('@recognize');

    cy.contains('egg').should('be.visible');
    cy.contains('tomato').should('be.visible');
    cy.contains('Sinh công thức').should('be.visible');
  });

it('bấm sinh công thức tạo đúng URL với ingredients', () => {
  cy.intercept('POST', '/api/recognize', {
    statusCode: 200,
    body: { ingredients: ['egg', 'tomato'] }
  }).as('recognize');

  cy.get('input[type="file"]').selectFile({
    contents: Cypress.Buffer.from('fake-image'),
    fileName: 'food.jpg',
    mimeType: 'image/jpeg',
  }, { force: true });

  cy.wait('@recognize');

  // Kiểm tra ingredients hiện đúng
  cy.contains('egg').should('be.visible');
  cy.contains('tomato').should('be.visible');
  cy.contains('Nguyên liệu phát hiện (2)').should('be.visible');

  // Kiểm tra nút sinh công thức có đúng text
  cy.contains('Sinh công thức từ 2 nguyên liệu này →').should('be.visible');

  // Intercept navigation request thay vì check URL
  cy.intercept('GET', '/CreateRecipe*').as('navigateToCreate');

  cy.contains('Sinh công thức từ 2 nguyên liệu này →').click();

  // Verify request có oldIngredients đúng
  cy.wait('@navigateToCreate').its('request.url')
    .should('include', 'oldIngredients=egg')
    .and('include', 'oldIngredients=tomato');
});
});